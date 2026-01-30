package platform

import (
	"io"
	"os"
	"path/filepath"
)

func SafeWriteFile(path string, data io.Reader) error {
	dst, err := os.Create(path)
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, data); err != nil {
		return err
	}
	return dst.Sync()
}

func ListExtFiles(dirPath string, ext string) ([]os.DirEntry, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var files []os.DirEntry
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ext {
			files = append(files, e)
		}
	}
	return files, nil
}

func CreateHardLink(src, dst string) error {
	_ = os.Remove(dst)
	return os.Link(src, dst)
}

func SafeRename(oldPath, newPath string) error {
	return os.Rename(oldPath, newPath)
}

func RemoveFile(path string) error {
	return os.Remove(path)
}

func DeleteByPattern(pattern string) error {
	files, err := filepath.Glob(pattern)
	if err != nil {
		return err
	}
	for _, f := range files {
		_ = os.RemoveAll(f)
	}
	return nil
}

func RemoveAll(path string) error {
	return os.RemoveAll(path)
}
