package services

import (
	"fmt"
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

type FileManager struct {
	cfg *config.Config
}

func NewFileManager(cfg *config.Config) *FileManager {
	return &FileManager{cfg: cfg}
}

// GetDocumentInfo returns detailed information about a document
func (fm *FileManager) GetDocumentInfo(id string) (*models.DocumentInfo, error) {
	meta, err := rmfs.GetMetadata(fm.cfg.XochitlPath, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get metadata: %w", err)
	}
	content, err := rmfs.GetContent(fm.cfg.XochitlPath, id)
	var pageCount int
	var fileType string
	if err != nil {
		fmt.Printf("Warning: failed to get content for %s: %v\n", id, err)
		fileType = "unknown"
	} else {
		pageCount = content.PageCount
		fileType = content.FileType
	}

	var filePath string
	var fileSize int64
	ext, err := rmfs.GetOrigExtension(fm.cfg.XochitlPath, id)
	if err != nil {
		fmt.Printf("Warning: content file missing for %s\n", id)
		fileType = "missing"
	} else {
		filePath = filepath.Join(fm.cfg.XochitlPath, id+ext)
		if size, err := platform.GetFileSize(filePath); err == nil {
			fileSize = size
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
	}, nil
}

// ListDocuments returns all documents from xochitl directory
func (fm *FileManager) ListDocuments() ([]models.DocumentInfo, error) {
	docs := make([]models.DocumentInfo, 0)

	files, err := platform.ListExtFiles(fm.cfg.XochitlPath, ".metadata")
	if err != nil {
		if os.IsNotExist(err) {
			return docs, nil
		}
		return nil, fmt.Errorf("failed to read xochitl directory: %w", err)
	}

	for _, f := range files {
		id := strings.TrimSuffix(f.Name(), ".metadata")
		info, err := fm.GetDocumentInfo(id)
		if err != nil {
			fmt.Printf("Warning: error getting document info: %v\n", err)
			continue
		}
		docs = append(docs, *info)
	}

	sort.Slice(docs, func(i, j int) bool {
		return docs[i].ModifiedTime > docs[j].ModifiedTime
	})

	return docs, nil
}

func (fm *FileManager) MoveDocumentToTrash(id string) error {

	if err := rmfs.UpdateMetadata(fm.cfg.XochitlPath, id, func(meta *models.RmMetadata) {
		meta.Parent = "trash"
		meta.MetadataModified = true
		meta.LastModified = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}); err != nil {
		return fmt.Errorf("failed to update metadata: %w", err)
	}

	return nil
}

// DeleteDocument Permanently delete document and create tombstone
func (fm *FileManager) DeleteDocument(id string) error {
	ext, err := rmfs.GetOrigExtension(fm.cfg.XochitlPath, id)
	if err != nil {
		return fmt.Errorf("failed to get extension: %w", err)
	}
	sourcePath := filepath.Join(fm.cfg.XochitlPath, id+ext)

	if hardLink, _ := rmfs.FindHardLinkPath(fm.cfg.BooksPath, sourcePath); hardLink != "" {
		_ = platform.RemoveFile(hardLink)
	}

	// Remove all files with this id
	pattern := filepath.Join(fm.cfg.XochitlPath, id+".*")
	if err := platform.DeleteByPattern(pattern); err != nil {
		return fmt.Errorf("failed to remove files: %w", err)
	}
	_ = platform.RemoveAll(filepath.Join(fm.cfg.XochitlPath, id))

	// Create tombstone
	if err := rmfs.CreateTombstone(fm.cfg.XochitlPath, id); err != nil {
		return fmt.Errorf("failed to create tombstone: %w", err)
	}

	return nil
}

// RenameDocument updates the visible name in metadata and renames symlink
func (fm *FileManager) RenameDocument(id, newName string) error {
	if newName == "" {
		return fmt.Errorf("new name cannot be empty")
	}

	origExt, err := rmfs.GetOrigExtension(fm.cfg.XochitlPath, id)
	if err != nil {
		return fmt.Errorf("failed to get extension: %w", err)
	}

	if err := rmfs.UpdateMetadata(fm.cfg.XochitlPath, id, func(meta *models.RmMetadata) {
		meta.VisibleName = newName
		meta.MetadataModified = true
		meta.LastModified = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}); err != nil {
		return fmt.Errorf("failed to update metadata: %w", err)
	}

	sourcePath := filepath.Join(fm.cfg.XochitlPath, id+origExt)
	newLinkPath := filepath.Join(fm.cfg.BooksPath, newName+origExt)
	oldLinkPath, err := rmfs.FindHardLinkPath(fm.cfg.BooksPath, sourcePath)
	if err != nil {
		fmt.Printf("Warning: error finding hard link: %v\n", err)
	}

	if oldLinkPath != "" {
		if err := platform.SafeRename(oldLinkPath, newLinkPath); err != nil {
			return fmt.Errorf("failed to rename hard link: %w", err)
		}
	} else {
		if linkErr := platform.CreateHardLink(sourcePath, newLinkPath); linkErr != nil {
			fmt.Printf("Warning: failed to create hardlink: %v\n", linkErr)
		}
	}

	return nil
}

// SearchDocuments searches documents by name
func (fm *FileManager) SearchDocuments(query string) ([]models.DocumentInfo, error) {
	allDocs, err := fm.ListDocuments()
	if err != nil {
		return nil, err
	}

	if query == "" {
		return allDocs, nil
	}

	query = strings.ToLower(query)
	var results []models.DocumentInfo

	for _, doc := range allDocs {
		if strings.Contains(strings.ToLower(doc.Name), query) ||
			strings.Contains(strings.ToLower(doc.Type), query) {
			results = append(results, doc)
		}
	}

	return results, nil
}

// UploadDocument handles the business logic of saving a file
func (fm *FileManager) UploadDocument(file multipart.File, header *multipart.FileHeader) (id string, err error) {
	id = uuid.New().String()
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" && ext != ".epub" {
		return "", fmt.Errorf("only support PDF/EPUB")
	}

	targetPath := filepath.Join(fm.cfg.XochitlPath, id+ext)

	defer func() {
		if err != nil {
			fmt.Printf("Upload failed (err=%v), cleaning up: %s\n", err, targetPath)
			_ = platform.RemoveFile(targetPath)
		}
	}()

	// Save File
	if err = platform.SafeWriteFile(targetPath, file); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	// Save Metadata
	meta := &models.RmMetadata{
		LastModified: strconv.FormatInt(time.Now().UnixMilli(), 10),
		Type:         "DocumentType",
		Version:      1,
		VisibleName:  strings.TrimSuffix(header.Filename, ext),
	}
	if err = rmfs.SaveMetadata(fm.cfg.XochitlPath, id, meta); err != nil {
		return "", fmt.Errorf("failed to create metadata: %w", err)
	}

	// Save Content
	if err = rmfs.CreateContent(fm.cfg.XochitlPath, id, ext); err != nil {
		return "", fmt.Errorf("failed to create content: %w", err)
	}

	// Create Hard Link
	linkPath := filepath.Join(fm.cfg.BooksPath, header.Filename)
	if linkErr := platform.CreateHardLink(targetPath, linkPath); linkErr != nil {
		// Log warning but maybe don't fail the whole upload?
		fmt.Printf("Warning: failed to create hardlink: %v\n", linkErr)
	}

	return id, nil
}
