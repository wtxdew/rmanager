package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"rmanager/internal/config"
	"rmanager/internal/platform"
	"time"
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
	dst, _ := os.Create(filepath.Join(cfg.HistoryPath, time.Now().Format("20060102 150405")+".png"))
	defer dst.Close()

	io.Copy(dst, image)
}
