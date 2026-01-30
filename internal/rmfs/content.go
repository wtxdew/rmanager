package rmfs

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"rmanager/internal/models"
)

func GetContent(basePath, id string) (*models.RmContent, error) {
	contentPath := filepath.Join(basePath, id+".content")
	contentJson, err := os.ReadFile(contentPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read content: %w", err)
	}

	var content models.RmContent
	if err := json.Unmarshal(contentJson, &content); err != nil {
		return nil, fmt.Errorf("failed to parse content: %w", err)
	}

	return &content, nil
}

func CreateContent(basePath, id, fileType string) error {
	content := &models.RmContent{}

	switch fileType {
	case ".pdf":
		content.FileType = "pdf"
		content.ExtraMetadata = make(map[string]interface{})
		content.FontName = ""
		content.LineHeight = -1
		content.PageCount = 1
		content.TextScale = 1
		_ = os.MkdirAll(filepath.Join(basePath, id+".thumbnails"), 0755)
	case ".epub":
		content.FileType = "epub"
	default:
		return fmt.Errorf("unsupported file type: %s", fileType)
	}

	contentJson, err := json.Marshal(content)
	if err != nil {
		return fmt.Errorf("failed to marshal content: %w", err)
	}
	path := filepath.Join(basePath, id+".content")
	return os.WriteFile(path, []byte(contentJson), 0644)
}

func GetOrigExtension(basePath, id string) (string, error) {
	content, err := GetContent(basePath, id)
	if err != nil {
		return "", fmt.Errorf("failed to get content: %w", err)
	}

	switch content.FileType {
	case "pdf":
		return ".pdf", nil
	case "epub":
		return ".epub", nil
	}

	// Fallback
	if _, err := os.Stat(filepath.Join(basePath, id+".epub")); err == nil {
		return ".epub", nil
	}
	if _, err := os.Stat(filepath.Join(basePath, id+".pdf")); err == nil {
		return ".pdf", nil
	}

	return "", fmt.Errorf("unknown file type")
}
