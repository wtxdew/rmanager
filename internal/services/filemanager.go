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
	"rmanager/internal/metadata"
	"rmanager/internal/models"

	"github.com/google/uuid"
)

// ListDocuments returns all non-deleted documents from xochitl directory
func ListDocuments(cfg *config.Config) ([]models.DocumentFile, error) {
	files, err := os.ReadDir(cfg.XochitlPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read xochitl directory: %w", err)
	}

	var docs []models.DocumentFile
	processed := make(map[string]bool)

	for _, f := range files {
		name := f.Name()
		ext := filepath.Ext(name)

		// Only process .metadata files
		if ext != ".metadata" {
			continue
		}

		id := strings.TrimSuffix(name, ext)
		if processed[id] {
			continue
		}
		processed[id] = true

		// Read metadata
		metaPath := filepath.Join(cfg.XochitlPath, name)
		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}

		var meta models.RmMetadata
		if err := json.Unmarshal(data, &meta); err != nil {
			continue
		}

		// Skip deleted documents
		if meta.Deleted {
			continue
		}

		// Find corresponding document file
		var fileType string
		var fileSize int64
		var modTime time.Time

		for _, testExt := range []string{".pdf", ".epub"} {
			testPath := filepath.Join(cfg.XochitlPath, id+testExt)
			if info, err := os.Stat(testPath); err == nil {
				fileType = testExt[1:]
				fileSize = info.Size()
				modTime = info.ModTime()
				break
			}
		}

		// Skip if no document file found
		if fileType == "" {
			continue
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

	// Sort by modified time (newest first)
	sort.Slice(docs, func(i, j int) bool {
		return docs[i].ModifiedTime > docs[j].ModifiedTime
	})

	return docs, nil
}

func MoveDocumentToTrash(cfg *config.Config, id string) error {
	return metadata.MoveToTrash(cfg.XochitlPath, id)
}

// PermanentlyDeleteDocument directly delete document and create tombstone
func PermanentlyDeleteDocument(cfg *config.Config, id string) error {
	return metadata.DeletePermanently(cfg, id)
}

// RenameDocument updates the visible name in metadata and renames symlink
func RenameDocument(cfg *config.Config, id, newName string) error {
	if newName == "" {
		return fmt.Errorf("new name cannot be empty")
	}
	return metadata.UpdateName(cfg, id, newName)
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
	if err = metadata.CreateMetadata(cfg.XochitlPath, id, meta); err != nil {
		return "", fmt.Errorf("failed to create metadata: %w", err)
	}

	// Create Content
	if err = metadata.CreateContent(cfg.XochitlPath, id, ext); err != nil {
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
