package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"rmanager/internal/config"
	"rmanager/internal/platform"
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

		// Ensure directory exists (needed for development mode)
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
