package rmfs

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"rmanager/internal/models"
)

func GetMetadata(basePath, id string) (*models.RmMetadata, error) {
	path := filepath.Join(basePath, id+".metadata")

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var meta models.RmMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, fmt.Errorf("invalid json: %w", err)
	}

	return &meta, nil
}

func SaveMetadata(basePath, id string, meta *models.RmMetadata) error {
	path := filepath.Join(basePath, id+".metadata")

	data, err := json.MarshalIndent(meta, "", " ")
	if err != nil {
		return err
	}
	tmpFile := path + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return err
	}

	return os.Rename(tmpFile, path)
}

func UpdateMetadata(basePath, id string, updateFunc func(*models.RmMetadata)) error {
	meta, err := GetMetadata(basePath, id)
	if err != nil {
		return err
	}

	updateFunc(meta)

	return SaveMetadata(basePath, id, meta)
}
