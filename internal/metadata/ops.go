package metadata

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"rmanager/internal/config"
	"rmanager/internal/models"
)

// GetMetadata reads the metadata for a given document ID
func GetMetadata(xochitlPath, id string) (*models.RmMetadata, error) {
	metaPath := filepath.Join(xochitlPath, id+".metadata")
	metaJson, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata: %w", err)
	}

	var meta models.RmMetadata
	if err := json.Unmarshal(metaJson, &meta); err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}

	return &meta, nil
}

func GetOrigExtension(xochitlPath, id string) (string, error) {
	contentPath := filepath.Join(xochitlPath, id+".content")
	contentJson, err := os.ReadFile(contentPath)
	if err != nil {
		return "", fmt.Errorf("failed to read content: %w", err)
	}

	var content models.RmContent
	if err := json.Unmarshal(contentJson, &content); err != nil {
		return "", fmt.Errorf("failed to parse content: %w", err)
	}

	switch content.FileType {
	case "pdf":
		return ".pdf", nil
	case "epub":
		return ".epub", nil
	}

	// Fallback
	if _, err := os.Stat(filepath.Join(xochitlPath, id+".epub")); err == nil {
		return ".epub", nil
	}
	if _, err := os.Stat(filepath.Join(xochitlPath, id+".pdf")); err == nil {
		return ".pdf", nil
	}

	return "", nil
}

func UpdateMetadata(xochitlPath, id string, updateFn func(*models.RmMetadata)) error {
	meta, err := GetMetadata(xochitlPath, id)
	if err != nil {
		return err
	}

	updateFn(meta)

	metaJson, err := json.MarshalIndent(meta, "", " ")
	if err != nil {
		return err
	}

	metaPath := filepath.Join(xochitlPath, id+".metadata")
	tmpFile := metaPath + ".tmp"
	if err := os.WriteFile(tmpFile, metaJson, 0644); err != nil {
		return fmt.Errorf("failed to write tmp metadata: %w", err)
	}

	return os.Rename(tmpFile, metaPath)
}

// UpdateName updates the visibleName in metadata and renames the hard link in books/
func UpdateName(cfg *config.Config, id, newName string) error {
	origExt, err := GetOrigExtension(cfg.XochitlPath, id)
	if err != nil {
		return fmt.Errorf("failed to get extension: %w", err)
	}

	if err := UpdateMetadata(cfg.XochitlPath, id, func(meta *models.RmMetadata) {
		meta.VisibleName = newName
		meta.MetadataModified = true
		meta.LastModified = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}); err != nil {
		return fmt.Errorf("failed to update metadata: %w", err)
	}

	sourcePath := filepath.Join(cfg.XochitlPath, id+origExt)
	newLinkPath := filepath.Join(cfg.BooksPath, newName+origExt)
	oldLinkPath, err := FindHardLinkPath(cfg.BooksPath, sourcePath)
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

// TODO: sync books/trash
func MoveToTrash(xochitlPath, id string) error {
	if err := UpdateMetadata(xochitlPath, id, func(meta *models.RmMetadata) {
		meta.Parent = "trash"
		meta.MetadataModified = true
		meta.LastModified = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}); err != nil {
		return err
	}

	return nil
}

func DeletePermanently(cfg *config.Config, id string) error {
	ext, err := GetOrigExtension(cfg.XochitlPath, id)
	if err != nil {
		return fmt.Errorf("failed to get extension: %w", err)
	}
	sourcePath := filepath.Join(cfg.XochitlPath, id+ext)

	hardLinkPath, _ := FindHardLinkPath(cfg.BooksPath, sourcePath)
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

func SyncLibrary(cfg *config.Config) error {
	fmt.Println("Starting library synchronization...")

	// Map Key: "MyBook.pdf"
	// Map Value: "/.../xochitl/uuid.pdf"
	expectedLinks := make(map[string]string)

	files, err := os.ReadDir(cfg.XochitlPath)
	if err != nil {
		return fmt.Errorf("failed to read xochitl dir: %w", err)
	}

	for _, f := range files {
		if filepath.Ext(f.Name()) == ".metadata" {
			id := strings.TrimSuffix(f.Name(), ".metadata")

			meta, err := GetMetadata(cfg.XochitlPath, id)
			if err != nil {
				continue
			}

			ext, err := GetOrigExtension(cfg.XochitlPath, id)
			if err != nil {
				continue
			}

			linkName := meta.VisibleName + ext
			sourcePath := filepath.Join(cfg.XochitlPath, id+ext)

			expectedLinks[linkName] = sourcePath
		}
	}

	for linkName, sourcePath := range expectedLinks {
		linkPath := filepath.Join(cfg.BooksPath, linkName)

		fileInfo, err := os.Lstat(linkPath)

		if os.IsNotExist(err) {
			if err := os.Link(sourcePath, linkPath); err != nil {
				fmt.Printf("Failed to create link for %s: %v\n", linkName, err)
			}
		} else {
			// Exist but Symbolic: Migrate to Hardlink
			if fileInfo.Mode()&os.ModeSymlink != 0 {
				os.Remove(linkPath)
				os.Link(sourcePath, linkPath)
				fmt.Printf("Migrated symlink to hardlink: %s\n", linkName)
				continue
			}

			srcInode, _ := getInode(sourcePath)
			dstInode, _ := getInode(linkPath)

			// Exist but Inode not match: Fix broken link
			if srcInode != 0 && srcInode != dstInode {
				os.Remove(linkPath)
				os.Link(sourcePath, linkPath)
				fmt.Printf("Fixed broken link: %s\n", linkName)
			}
		}
	}

	CleanOrphans(cfg, expectedLinks)

	fmt.Println("Library synchronization finished.")
	return nil
}

func CleanOrphans(cfg *config.Config, expectedLinks map[string]string) {
	fmt.Println("Cleaning orphan files...")

	validInodes := make(map[uint64]bool)
	for _, sourcePath := range expectedLinks {
		if ino, err := getInode(sourcePath); err == nil {
			validInodes[ino] = true
		}
	}

	entries, err := os.ReadDir(cfg.BooksPath)
	if err != nil {
		fmt.Printf("[ERROR] reading books dir: %v\n", err)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		filename := entry.Name()
		fullPath := filepath.Join(cfg.BooksPath, filename)

		if _, isExpected := expectedLinks[filename]; isExpected {
			continue
		}

		ino, err := getInode(fullPath)
		if err != nil {
			continue
		}

		if validInodes[ino] {
			fmt.Printf("Removing ghost hardlink (renamed artifact): %s\n", filename)
			os.Remove(fullPath)
		} else {
			// Individual Inode
		}
	}
}

func getLinkCount(path string) int {
	fi, err := os.Stat(path)
	if err != nil {
		return 0
	}
	stat, ok := fi.Sys().(*syscall.Stat_t)
	if !ok {
		return 0
	}
	return int(stat.Nlink)
}

func getInode(path string) (uint64, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	stat, ok := fileInfo.Sys().(*syscall.Stat_t)
	if !ok {
		return 0, fmt.Errorf("not a unix system")
	}
	return stat.Ino, nil
}

func FindHardLinkPath(booksDir string, sourcePath string) (string, error) {
	srcInode, err := getInode(sourcePath)
	if err != nil {
		return "", fmt.Errorf("failed to get inode: %w", err)
	}

	entries, err := os.ReadDir(booksDir)
	if err != nil {
		return "", fmt.Errorf("failed to read books dir: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			fullPath := filepath.Join(booksDir, entry.Name())
			targetInode, err := getInode(fullPath)
			if err == nil && targetInode == srcInode {
				return fullPath, nil
			}
		}
	}
	return "", fmt.Errorf("hard link not found")
}
