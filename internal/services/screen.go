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

type ScreenService struct {
	cfg *config.Config
}

func NewScreenService(cfg *config.Config) *ScreenService {
	return &ScreenService{
		cfg: cfg,
	}
}

func (s *ScreenService) UploadScreen(image io.ReadSeeker) error {
	if err := platform.Mount(s.cfg, "rw"); err != nil {
		return fmt.Errorf("mount rw failed: %w", err)
	}
	defer platform.Mount(s.cfg, "ro")

	if err := os.MkdirAll(s.cfg.ScreenPath, 0755); err != nil {
		return fmt.Errorf("mkdir screen path failed: %w", err)
	}

	dstPath := filepath.Join(s.cfg.ScreenPath, "suspended.png")
	if err := platform.SafeWriteFile(dstPath, image); err != nil {
		return fmt.Errorf("write screen file failed: %w", err)
	}

	if _, err := image.Seek(0, 0); err != nil {
		return fmt.Errorf("reset image stream failed: %w", err)
	}

	if err := s.saveToHistoryLibrary(image); err != nil {
		return fmt.Errorf("save history failed: %w", err)
	}

	return nil
}

func (s *ScreenService) GetHistoryLibrary() ([]models.SuspendHistoryItem, error) {
	historyItems := make([]models.SuspendHistoryItem, 0)

	files, err := platform.ListExtFiles(s.cfg.HistoryPath, ".png")
	if err != nil {
		if os.IsNotExist(err) {
			return historyItems, nil
		}
		return nil, fmt.Errorf("failed to read history directory: %w", err)
	}

	for _, file := range files {
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

func (s *ScreenService) GetHistoryFilePath(filename string) (string, error) {
	if filepath.Ext(filename) != ".png" {
		return "", fmt.Errorf("invalid file type, only .png allowed")
	}

	path, err := getValidatedPath(s.cfg.HistoryPath, filename)
	if err != nil {
		return "", fmt.Errorf("history error: %w: %s", err, filename)
	}
	return path, nil
}

func (s *ScreenService) GetCurrentSuspendPath() (string, error) {
	path, err := getValidatedPath(s.cfg.ScreenPath, "suspended.png")
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

func (s *ScreenService) saveToHistoryLibrary(image io.Reader) error {
	// uuid + .png
	// dst, err := os.Create(filepath.Join(cfg.HistoryPath, uuid.New().String()+".png"))
	// timestamp + .png
	if err := os.MkdirAll(s.cfg.HistoryPath, 0755); err != nil {
		return err
	}
	filename := time.Now().Format("20060102-150405") + ".png"
	dstPath := filepath.Join(s.cfg.HistoryPath, filename)

	return platform.SafeWriteFile(dstPath, image)
}
