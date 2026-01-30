package services

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
	"sort"
	"time"
)

func UploadScreen(cfg *config.Config, image io.ReadSeeker) error {
	if err := platform.Mount(cfg, "rw"); err != nil {
		return fmt.Errorf("mount rw failed: %w", err)
	}
	defer func() {
		_ = platform.Mount(cfg, "ro")
	}()
	if err := os.MkdirAll(cfg.ScreenPath, 0755); err != nil {
		return fmt.Errorf("mkdir screen path failed: %w", err)
	}

	dstPath := filepath.Join(cfg.ScreenPath, "suspended.png")
	if err := copyToFile(dstPath, image); err != nil {
		return fmt.Errorf("write screen file failed: %w", err)
	}

	if _, err := image.Seek(0, 0); err != nil {
		return fmt.Errorf("reset image stream failed: %w", err)
	}

	if err := saveToHistoryLibrary(cfg, image); err != nil {
		return fmt.Errorf("save history failed: %w", err)
	}

	return nil
}

func GetHistoryLibrary(cfg *config.Config) ([]models.SuspendHistoryItem, error) {
	historyItems := make([]models.SuspendHistoryItem, 0)

	files, err := os.ReadDir(cfg.HistoryPath)
	if err != nil {
		if os.IsNotExist(err) {
			return historyItems, nil
		}
		return nil, fmt.Errorf("failed to read history directory: %w", err)
	}

	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".png" {
			continue
		}
		historyItems = append(historyItems, models.SuspendHistoryItem{
			Filename: file.Name(),
			Url:      "/api/history-suspend/" + file.Name(),
		})
	}

	sort.Slice(historyItems, func(i, j int) bool {
		return historyItems[i].Filename > historyItems[j].Filename
	})
	return historyItems, nil
}

func GetHistoryFilePath(cfg *config.Config, filename string) (string, error) {
	if filepath.Ext(filename) != ".png" {
		return "", fmt.Errorf("invalid file type, only .png allowed")
	}

	path, err := getValidatedPath(cfg.HistoryPath, filename)
	if err != nil {
		return "", fmt.Errorf("history error: %w: %s", err, filename)
	}
	return path, nil
}

func GetCurrentSuspendPath(cfg *config.Config) (string, error) {
	path, err := getValidatedPath(cfg.ScreenPath, "suspended.png")
	if err != nil {
		return "", fmt.Errorf("screen error: %w: suspend.png", err)
	}
	return path, nil
}

func getValidatedPath(basePath, filename string) (string, error) {
	cleanName := filepath.Base(filename)
	fullPath := filepath.Join(basePath, cleanName)

	exists, err := platform.CheckIsFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("system error: %w", err)
	}
	if !exists {
		return "", models.ErrFileNotFound
	}

	return fullPath, nil
}

func saveToHistoryLibrary(cfg *config.Config, image io.Reader) error {
	// uuid + .png
	// dst, err := os.Create(filepath.Join(cfg.HistoryPath, uuid.New().String()+".png"))
	// timestamp + .png
	if err := os.MkdirAll(cfg.HistoryPath, 0755); err != nil {
		return err
	}
	filename := time.Now().Format("20060102-150405") + ".png"
	dstPath := filepath.Join(cfg.HistoryPath, filename)

	return copyToFile(dstPath, image)
}

func copyToFile(path string, src io.Reader) error {
	dst, err := os.Create(path)
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return err
	}
	return dst.Sync()
}
