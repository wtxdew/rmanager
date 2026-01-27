package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"rmanager/internal/config"
	"rmanager/internal/platform"
	"time"

	"github.com/go-chi/chi/v5"
)

// UploadSuspendScreen handles suspend screen image uploads
func UploadSuspendScreen(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST Support ONLY", http.StatusMethodNotAllowed)
			return
		}

		r.ParseMultipartForm(10 << 20)
		file, _, err := r.FormFile("image")
		if err != nil {
			http.Error(w, "Failed to read the file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Use platform-safe mount operation
		platform.Mount(cfg, "rw")
		os.MkdirAll(cfg.ScreenPath, 0755)

		dst, err := os.Create(filepath.Join(cfg.ScreenPath, "suspended.png"))
		if err != nil {
			platform.Mount(cfg, "ro")
			http.Error(w, "Unable to write: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			platform.Mount(cfg, "ro")
			http.Error(w, "Failed to save image: "+err.Error(), http.StatusInternalServerError)
			return
		}
		file.Seek(0, 0)
		SaveToHistoryLibrary(cfg, file)
		platform.Mount(cfg, "ro")

		fmt.Fprint(w, "Successfully changed the suspend screen!")
	}
}

// GetCurrentSuspend serves the current suspend screen image
func GetCurrentSuspend(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		http.ServeFile(w, r, filepath.Join(cfg.ScreenPath, "suspended.png"))
	}
}

func SaveToHistoryLibrary(cfg *config.Config, image io.Reader) {
	// uuid + .png
	// dst, err := os.Create(filepath.Join(cfg.HistoryPath, uuid.New().String()+".png"))
	// timestamp + .png
	filename := time.Now().Format("20060102-150405") + ".png"
	dst, _ := os.Create(filepath.Join(cfg.HistoryPath, filename))
	defer dst.Close()

	io.Copy(dst, image)
}

func GetHistoryLibrary(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		files, err := os.ReadDir(cfg.HistoryPath)
		if err != nil {
			http.Error(w, "Unable to read: "+err.Error(), http.StatusInternalServerError)
			return
		}

		type HistoryItem struct {
			Filename string `json:"filename"`
			Url      string `json:"url"`
		}

		var historyItems []HistoryItem
		for _, file := range files {
			if file.IsDir() || filepath.Ext(file.Name()) != ".png" {
				continue
			}
			historyItems = append(historyItems, HistoryItem{
				Filename: file.Name(),
				Url:      "/api/history-suspend/" + file.Name(),
			})
		}

		// Sort by filename (timestamp) descending
		for i := len(historyItems)/2 - 1; i >= 0; i-- {
			opp := len(historyItems) - 1 - i
			historyItems[i], historyItems[opp] = historyItems[opp], historyItems[i]
		}

		json.NewEncoder(w).Encode(historyItems)
	}
}

func GetHistoryItem(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filename := chi.URLParam(r, "filename")
		if filename == "" {
			http.Error(w, "Filename is required", http.StatusBadRequest)
			return
		}

		// Clean and validate filename to prevent directory traversal
		cleanPath := filepath.Base(filename)
		if cleanPath == "/" || cleanPath == "." || cleanPath == ".." {
			http.Error(w, "Invalid filename", http.StatusBadRequest)
			return
		}

		w.Header().Set("Cache-Control", "public, max-age=31536000") // Cache history items aggressively
		http.ServeFile(w, r, filepath.Join(cfg.HistoryPath, cleanPath))
	}
}
