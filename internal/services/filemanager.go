package services

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
	"rmanager/internal/rmfs"

	"github.com/google/uuid"
)

// ListDocuments returns all non-deleted documents from xochitl directory
func ListDocuments(cfg *config.Config) ([]models.DocumentFile, error) {
	var docs []models.DocumentFile

	files, err := os.ReadDir(cfg.XochitlPath)
	if err != nil {
		if os.IsNotExist(err) {
			return docs, nil
		}
		return nil, fmt.Errorf("failed to read xochitl directory: %w", err)
	}

	processed := make(map[string]bool)
	for _, f := range files {
		name := f.Name()
		ext := filepath.Ext(name)

		if ext != ".metadata" {
			continue
		}

		id := strings.TrimSuffix(name, ext)
		if processed[id] {
			continue
		}
		processed[id] = true

		metaPath := filepath.Join(cfg.XochitlPath, name)
		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}

		var meta models.RmMetadata
		if err := json.Unmarshal(data, &meta); err != nil {
			continue
		}

		// Find corresponding document file
		fileType, err := rmfs.GetOrigExtension(cfg.XochitlPath, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get extension: %w", err)
		}
		fileSize, err := platform.GetFileSize(filepath.Join(cfg.XochitlPath, id+fileType))
		if err != nil {
			return nil, fmt.Errorf("failed to get file size: %w", err)
		}
		modTime, err := platform.GetFileModTime(filepath.Join(cfg.XochitlPath, id+fileType))
		if err != nil {
			return nil, fmt.Errorf("failed to get file mod time: %w", err)
		}

		// Parse timestamp from metadata
		modifiedTime := meta.LastModified
		if modifiedTime == "" {
			modifiedTime = fmt.Sprintf("%d", modTime.Unix()*1000)
		}

		docs = append(docs, models.DocumentFile{
			ID:           id,
			Name:         meta.VisibleName,
			Type:         fileType,
			Size:         fileSize,
			ModifiedTime: modifiedTime,
			Pinned:       meta.Pinned,
			Parent:       meta.Parent,
		})
	}

	sort.Slice(docs, func(i, j int) bool {
		return docs[i].ModifiedTime > docs[j].ModifiedTime
	})

	return docs, nil
}

func MoveDocumentToTrash(cfg *config.Config, id string) error {

	if err := rmfs.UpdateMetadata(cfg.XochitlPath, id, func(meta *models.RmMetadata) {
		meta.Parent = "trash"
		meta.MetadataModified = true
		meta.LastModified = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}); err != nil {
		return err
	}

	return nil
}

// PermanentlyDeleteDocument directly delete document and create tombstone
func DeleteDocument(cfg *config.Config, id string) error {
	ext, err := rmfs.GetOrigExtension(cfg.XochitlPath, id)
	if err != nil {
		return fmt.Errorf("failed to get extension: %w", err)
	}
	sourcePath := filepath.Join(cfg.XochitlPath, id+ext)

	hardLinkPath, _ := rmfs.FindHardLinkPath(cfg.BooksPath, sourcePath)
	if hardLinkPath != "" {
		if err := os.Remove(hardLinkPath); err != nil {
			fmt.Printf("Failed to remove hard link: %v\n", err)
		}
	}

	// Remove all files with this id
	files, _ := filepath.Glob(filepath.Join(cfg.XochitlPath, id+".*"))
	for _, f := range files {
		os.RemoveAll(f)
	}
	os.RemoveAll(filepath.Join(cfg.XochitlPath, id))

	// Create tombstone
	os.WriteFile(filepath.Join(cfg.XochitlPath, id+".tombstone"), []byte(time.Now().Format("Mon Jan 2 15:04:05 2006")), 0644)

	return nil
}

// RenameDocument updates the visible name in metadata and renames symlink
func RenameDocument(cfg *config.Config, id, newName string) error {
	if newName == "" {
		return fmt.Errorf("new name cannot be empty")
	}

	origExt, err := rmfs.GetOrigExtension(cfg.XochitlPath, id)
	if err != nil {
		return fmt.Errorf("failed to get extension: %w", err)
	}

	if err := rmfs.UpdateMetadata(cfg.XochitlPath, id, func(meta *models.RmMetadata) {
		meta.VisibleName = newName
		meta.MetadataModified = true
		meta.LastModified = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}); err != nil {
		return fmt.Errorf("failed to update metadata: %w", err)
	}

	sourcePath := filepath.Join(cfg.XochitlPath, id+origExt)
	newLinkPath := filepath.Join(cfg.BooksPath, newName+origExt)
	oldLinkPath, err := rmfs.FindHardLinkPath(cfg.BooksPath, sourcePath)
	if err != nil {
		fmt.Printf("Warning: error finding hard link: %v\n", err)
	}

	if oldLinkPath != "" {
		if err := os.Rename(oldLinkPath, newLinkPath); err != nil {
			return fmt.Errorf("failed to rename hard link: %w", err)
		}
	} else {
		if err := os.Link(sourcePath, newLinkPath); err != nil {
			if os.IsExist(err) {
				os.Remove(newLinkPath)
				if err := os.Link(sourcePath, newLinkPath); err != nil {
					return fmt.Errorf("failed to recreate hard link: %w", err)
				}
			} else {
				return fmt.Errorf("failed to create hard link: %w", err)
			}
		}
	}

	return nil
}

// GetDocumentInfo returns detailed information about a document
func GetDocumentInfo(cfg *config.Config, id string) (*models.DocumentInfo, error) {
	metaPath := filepath.Join(cfg.XochitlPath, id+".metadata")

	data, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata: %w", err)
	}

	var meta models.RmMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}

	// Find document file
	var fileType string
	var fileSize int64
	var filePath string

	for _, testExt := range []string{".pdf", ".epub"} {
		testPath := filepath.Join(cfg.XochitlPath, id+testExt)
		if info, err := os.Stat(testPath); err == nil {
			fileType = testExt[1:]
			fileSize = info.Size()
			filePath = testPath
			break
		}
	}

	// Read content file for page count
	var pageCount int
	contentPath := filepath.Join(cfg.XochitlPath, id+".content")
	if contentData, err := os.ReadFile(contentPath); err == nil {
		var content map[string]interface{}
		if json.Unmarshal(contentData, &content) == nil {
			if pc, ok := content["pageCount"].(float64); ok {
				pageCount = int(pc)
			}
		}
	}

	return &models.DocumentInfo{
		ID:           id,
		Name:         meta.VisibleName,
		Type:         fileType,
		Size:         fileSize,
		Path:         filePath,
		ModifiedTime: meta.LastModified,
		Pinned:       meta.Pinned,
		Parent:       meta.Parent,
		PageCount:    pageCount,
		Deleted:      meta.Deleted,
	}, nil
}

// SearchDocuments searches documents by name
func SearchDocuments(cfg *config.Config, query string) ([]models.DocumentFile, error) {
	allDocs, err := ListDocuments(cfg)
	if err != nil {
		return nil, err
	}

	if query == "" {
		return allDocs, nil
	}

	query = strings.ToLower(query)
	var results []models.DocumentFile

	for _, doc := range allDocs {
		if strings.Contains(strings.ToLower(doc.Name), query) ||
			strings.Contains(strings.ToLower(doc.Type), query) {
			results = append(results, doc)
		}
	}

	return results, nil
}

// UploadDocument handles the business logic of saving a file
func UploadDocument(cfg *config.Config, file multipart.File, header *multipart.FileHeader) (string, error) {
	id := uuid.New().String()
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" && ext != ".epub" {
		return "", fmt.Errorf("only support PDF/EPUB")
	}

	targetPath := filepath.Join(cfg.XochitlPath, id+ext)

	// Save File
	dst, err := os.Create(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	_, err = io.Copy(dst, file)
	dst.Close()
	if err != nil {
		os.Remove(targetPath)
		return "", fmt.Errorf("failed to save file content: %w", err)
	}

	defer func() {
		if err != nil {
			os.Remove(targetPath)
		}
	}()

	// Create Metadata
	meta := &models.RmMetadata{
		Deleted:      false,
		LastModified: strconv.FormatInt(time.Now().UnixMilli(), 10),
		Type:         "DocumentType",
		Version:      1,
		VisibleName:  strings.TrimSuffix(header.Filename, ext),
	}
	if err = rmfs.SaveMetadata(cfg.XochitlPath, id, meta); err != nil {
		return "", fmt.Errorf("failed to create metadata: %w", err)
	}

	// Create Content
	if err = rmfs.CreateContent(cfg.XochitlPath, id, ext); err != nil {
		return "", fmt.Errorf("failed to create content: %w", err)
	}

	// Create Hard Link
	linkPath := filepath.Join(cfg.BooksPath, header.Filename)
	os.Remove(linkPath)
	if err = os.Link(targetPath, linkPath); err != nil {
		return "", fmt.Errorf("failed to create hard link: %w", err)
	}

	return id, nil
}
