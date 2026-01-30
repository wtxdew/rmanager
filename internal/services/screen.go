package services

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
	"time"
)

func UploadScreen(cfg *config.Config, image io.Reader) error {
	platform.Mount(cfg, "rw")
	os.MkdirAll(cfg.ScreenPath, 0755)

	dst, err := os.Create(filepath.Join(cfg.ScreenPath, "suspended.png"))
	if err != nil {
		platform.Mount(cfg, "ro")
		return fmt.Errorf("failed to create screen file: %w", err)
	}

	_, err = io.Copy(dst, image)
	dst.Close()
	if err != nil {
		platform.Mount(cfg, "ro")
		return fmt.Errorf("failed to copy screen file: %w", err)
	}

	image.(io.Seeker).Seek(0, 0)
	saveToHistoryLibrary(cfg, image)
	platform.Mount(cfg, "ro")

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

	for i := len(historyItems)/2 - 1; i >= 0; i-- {
		opp := len(historyItems) - 1 - i
		historyItems[i], historyItems[opp] = historyItems[opp], historyItems[i]
	}
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

func saveToHistoryLibrary(cfg *config.Config, image io.Reader) {
	// uuid + .png
	// dst, err := os.Create(filepath.Join(cfg.HistoryPath, uuid.New().String()+".png"))
	// timestamp + .png
	filename := time.Now().Format("20060102-150405") + ".png"
	dst, _ := os.Create(filepath.Join(cfg.HistoryPath, filename))
	defer dst.Close()

	io.Copy(dst, image)
}
