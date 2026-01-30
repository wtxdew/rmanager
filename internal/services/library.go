package services

import (
	"fmt"
	"os"
	"path/filepath"
	"rmanager/internal/config"
	"rmanager/internal/platform"
	"rmanager/internal/rmfs"
	"strings"
)

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

			meta, err := rmfs.GetMetadata(cfg.XochitlPath, id)
			if err != nil {
				continue
			}

			ext, err := rmfs.GetOrigExtension(cfg.XochitlPath, id)
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

			srcInode, _ := platform.GetInode(sourcePath)
			dstInode, _ := platform.GetInode(linkPath)

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
		if ino, err := platform.GetInode(sourcePath); err == nil {
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

		ino, err := platform.GetInode(fullPath)
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
