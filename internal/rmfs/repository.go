package rmfs

import (
	"fmt"
	"os"
	"path/filepath"
	"rmanager/internal/platform"
)

func FindHardLinkPath(booksDir string, sourcePath string) (string, error) {
	srcInode, err := platform.GetInode(sourcePath)
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
			targetInode, err := platform.GetInode(fullPath)
			if err == nil && targetInode == srcInode {
				return fullPath, nil
			}
		}
	}
	return "", fmt.Errorf("hard link not found")
}
