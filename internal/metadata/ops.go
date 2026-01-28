package metadata

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"rmanager/internal/models"
)

// GetMetadata reads the metadata for a given document ID
func GetMetadata(xochitlPath, id string) (*models.RmMetadata, error) {
	metaPath := filepath.Join(xochitlPath, id+".metadata")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata: %w", err)
	}

	var meta models.RmMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}

	return &meta, nil
}

// SaveMetadata writes the metadata to disk atomically
func SaveMetadata(xochitlPath, id string, meta *models.RmMetadata) error {
	metaPath := filepath.Join(xochitlPath, id+".metadata")

	data, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	// Atomic write
	tmpFile := metaPath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write tmp metadata: %w", err)
	}

	return os.Rename(tmpFile, metaPath)
}

// UpdateName updates the visible name of a document and its symlink
func UpdateName(xochitlPath, booksPath, id, newName string) error {
	// 1. Get current metadata
	meta, err := GetMetadata(xochitlPath, id)
	if err != nil {
		return err
	}

	// 2. Update metadata
	meta.VisibleName = newName
	meta.MetadataModified = true
	meta.Modified = true

	if err := SaveMetadata(xochitlPath, id, meta); err != nil {
		return err
	}

	// 3. Rename Symlink
	// We need to find the extension. We can try to guess it or look for the file.
	// We'll trust the existing symlink to have the correct extension,
	// or look for the source file.

	// Try to find existing symlink
	entries, err := os.ReadDir(booksPath)
	if err != nil {
		// Log warning but don't fail, maybe just try to create new one?
		fmt.Printf("Warning: failed to read books dir during rename: %v\n", err)
	}

	var oldLinkPath string
	var ext string

	// Look for the link pointing to this ID
	for _, entry := range entries {
		if entry.Type()&os.ModeSymlink != 0 {
			linkPath := filepath.Join(booksPath, entry.Name())
			target, err := os.Readlink(linkPath)
			if err == nil {
				// Target is likely absolute path to xochitl/{id}.{ext}
				targetBase := filepath.Base(target)
				if strings.HasPrefix(targetBase, id+".") {
					oldLinkPath = linkPath
					ext = filepath.Ext(entry.Name())
					break
				}
			}
		}
	}

	// If we didn't find the symlink, we should probably create one.
	// To create one, we need to know the source file extension (.pdf or .epub).
	if oldLinkPath == "" {
		// check if .pdf exists
		if _, err := os.Stat(filepath.Join(xochitlPath, id+".pdf")); err == nil {
			ext = ".pdf"
		} else if _, err := os.Stat(filepath.Join(xochitlPath, id+".epub")); err == nil {
			ext = ".epub"
		}
	}

	if ext != "" {
		newLinkPath := filepath.Join(booksPath, newName+ext)

		if oldLinkPath != "" {
			// Rename existing
			if err := os.Rename(oldLinkPath, newLinkPath); err != nil {
				return fmt.Errorf("failed to rename symlink: %w", err)
			}
		} else {
			// Create new
			targetPath := filepath.Join(xochitlPath, id+ext)
			if err := os.Symlink(targetPath, newLinkPath); err != nil {
				return fmt.Errorf("failed to create symlink: %w", err)
			}
		}
	}

	return nil
}

// Delete marks a document as deleted and removes its symlink
func Delete(xochitlPath, booksPath, id string) error {
	// 1. Get metadata
	meta, err := GetMetadata(xochitlPath, id)
	if err != nil {
		return err
	}

	// 2. Mark deleted
	meta.Deleted = true
	meta.MetadataModified = true
	meta.Modified = true

	if err := SaveMetadata(xochitlPath, id, meta); err != nil {
		return err
	}

	// 3. Remove Symlink
	// We scan for it to be sure
	entries, err := os.ReadDir(booksPath)
	if err != nil {
		return nil // Ignore error if we can't read dir
	}

	for _, entry := range entries {
		if entry.Type()&os.ModeSymlink != 0 {
			linkPath := filepath.Join(booksPath, entry.Name())
			target, err := os.Readlink(linkPath)
			if err == nil {
				targetBase := filepath.Base(target)
				if strings.HasPrefix(targetBase, id+".") {
					os.Remove(linkPath)
					// Verify we don't have duplicates? Break one is enough usually.
				}
			}
		}
	}

	return nil
}

// SyncSymlinks scans XochitlPath and ensures BooksPath has correct symlinks
func SyncSymlinks(xochitlPath, booksPath string) error {
	// 1. Clear existing symlinks? Or just update/add?
	// Safer to scan Xochitl and ensure symlink exists.
	// Also might need to clean up orphaned symlinks (links pointing to non-existent or deleted files).

	// Map of expected symlink names -> true
	expectedLinks := make(map[string]bool)

	files, err := os.ReadDir(xochitlPath)
	if err != nil {
		return fmt.Errorf("failed to read xochitl dir: %w", err)
	}

	for _, f := range files {
		if filepath.Ext(f.Name()) == ".metadata" {
			id := strings.TrimSuffix(f.Name(), ".metadata")

			// Get metadata
			meta, err := GetMetadata(xochitlPath, id)
			if err != nil || meta.Deleted {
				continue
			}

			// Determine content file (.pdf or .epub)
			var ext string
			if _, err := os.Stat(filepath.Join(xochitlPath, id+".pdf")); err == nil {
				ext = ".pdf"
			} else if _, err := os.Stat(filepath.Join(xochitlPath, id+".epub")); err == nil {
				ext = ".epub"
			} else {
				continue // No content file
			}

			// Expected link
			linkName := meta.VisibleName + ext
			linkPath := filepath.Join(booksPath, linkName)
			targetPath := filepath.Join(xochitlPath, id+ext)

			// Record expectation
			expectedLinks[linkName] = true

			// Check if link exists and points to correct target
			info, err := os.Lstat(linkPath)
			if err == nil {
				if info.Mode()&os.ModeSymlink != 0 {
					currentTarget, _ := os.Readlink(linkPath)
					if currentTarget != targetPath {
						// Wrong target, update it
						os.Remove(linkPath)
						os.Symlink(targetPath, linkPath)
					}
				} else {
					// Not a symlink? Backup or warn?
					// Just warn and skip for now
					fmt.Printf("Warning: %s exists but is not a symlink\n", linkPath)
				}
			} else if os.IsNotExist(err) {
				// Create it
				os.Symlink(targetPath, linkPath)
			}
		}
	}

	// Clean up unknown symlinks
	entries, err := os.ReadDir(booksPath)
	if err == nil {
		for _, entry := range entries {
			if entry.Type()&os.ModeSymlink != 0 {
				if !expectedLinks[entry.Name()] {
					// Remove orphan?
					// Maybe user added their own symlinks?
					// If we control this folder, we should clean it.
					// Let's print for now to be safe, or delete if we are confident.
					// Given the requirement "autofix on startup", we should delete.
					os.Remove(filepath.Join(booksPath, entry.Name()))
				}
			}
		}
	}

	return nil
}
