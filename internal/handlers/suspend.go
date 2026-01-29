package handlers

import (
	"errors"
	"net/http"
	"rmanager/internal/config"
	"rmanager/internal/services"

	"github.com/go-chi/chi/v5"
)

// UploadSuspendScreen handles suspend screen image uploads
func UploadSuspendScreen(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "POST Support ONLY")
			return
		}

		r.ParseMultipartForm(10 << 20)
		file, _, err := r.FormFile("image")
		if err != nil {
			writeError(w, http.StatusBadRequest, "Failed to read the file")
			return
		}
		defer file.Close()

		err = services.UploadScreen(cfg, file)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to upload screen: "+err.Error())
			return
		}

		writeJSON(w, http.StatusOK, nil, "Successfully uploaded the suspend screen!")
	}
}

// GetCurrentSuspend serves the current suspend screen image
func GetCurrentSuspend(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		imagePath, err := services.GetCurrentSuspendPath(cfg)
		if err != nil {
			if errors.Is(err, services.ErrFileNotFound) {
				writeError(w, http.StatusNotFound, "Suspend screen not found")
			} else {
				writeError(w, http.StatusInternalServerError, err.Error())
			}
			return
		}

		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		http.ServeFile(w, r, imagePath)
	}
}

func GetHistoryLibrary(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		historyItems, err := services.GetHistoryLibrary(cfg)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Unable to get history: "+err.Error())
			return
		}

		writeJSON(w, http.StatusOK, historyItems, "Successfully retrieved history library!")
	}
}

func GetHistoryItem(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filename := chi.URLParam(r, "filename")
		if filename == "" {
			writeError(w, http.StatusBadRequest, "Filename is required")
			return
		}

		filePath, err := services.GetHistoryFilePath(cfg, filename)
		if err != nil {
			if errors.Is(err, services.ErrFileNotFound) {
				writeError(w, http.StatusNotFound, "History item not found")
			} else {
				writeError(w, http.StatusBadRequest, err.Error())
			}
			return
		}

		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, filePath)
	}
}
