package rmfs

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"rmanager/internal/models"
)

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
