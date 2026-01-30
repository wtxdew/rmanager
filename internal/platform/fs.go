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

func ListPngFiles(dirPath string) ([]os.DirEntry, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var pngs []os.DirEntry
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".png" {
			pngs = append(pngs, e)
		}
	}
	return pngs, nil
}
