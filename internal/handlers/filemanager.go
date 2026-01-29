package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/services"
)

// ListDocuments returns all documents in the file manager
func ListDocuments(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		docs, err := services.ListDocuments(cfg)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.APIResponse{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: "success",
			Data:    docs,
		})
	}
}

// DeleteDocument marks a document as deleted
func DeleteDocument(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		err := services.PermanentlyDeleteDocument(cfg, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: "Document deleted successfully",
		})
	}
}

// RenameDocument updates the document name
func RenameDocument(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID      string `json:"id"`
			NewName string `json:"newName"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.ID == "" || req.NewName == "" {
			http.Error(w, "Missing id or newName", http.StatusBadRequest)
			return
		}

		err := services.RenameDocument(cfg, req.ID, req.NewName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: "Document renamed successfully",
		})
	}
}

// GetDocumentInfo returns detailed information about a document
func GetDocumentInfo(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		info, err := services.GetDocumentInfo(cfg, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: "success",
			Data:    info,
		})
	}
}

// SearchDocuments searches documents by query
func SearchDocuments(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")

		docs, err := services.SearchDocuments(cfg, query)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.APIResponse{
				Code:    500,
				Message: err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: "success",
			Data:    docs,
		})
	}
}

func UploadDocument(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		r.ParseMultipartForm(1000 << 20)
		file, header, err := r.FormFile("file")
		if err != nil {
			writeJSONError(w, 400, "Failed to read file")
			return
		}
		defer file.Close()

		id, err := services.UploadDocument(cfg, file, header)
		if err != nil {
			writeJSONError(w, 500, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: fmt.Sprintf("Successfully uploaded: %s (ID: %s)", header.Filename, id),
		})
	}
}

// 辅助函数：统一错误返回
func writeJSONError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(models.APIResponse{Code: code, Message: msg})
}
