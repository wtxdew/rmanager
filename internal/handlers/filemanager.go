package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"rmanager/internal/models"
	"rmanager/internal/services"
)

// ListDocuments returns all documents in the file manager
func ListDocuments(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		docs, err := fileSvc.ListDocuments()
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
func DeleteDocument(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		err := fileSvc.DeleteDocument(id)
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
func RenameDocument(fileSvc *services.FileManager) http.HandlerFunc {
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

		err := fileSvc.RenameDocument(req.ID, req.NewName)
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
func GetDocumentInfo(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			http.Error(w, "Missing id parameter", http.StatusBadRequest)
			return
		}

		info, err := fileSvc.GetDocumentInfo(id)
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
func SearchDocuments(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")

		docs, err := fileSvc.SearchDocuments(query)
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

func UploadDocument(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		r.ParseMultipartForm(1000 << 20)
		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, 400, "Failed to read file")
			return
		}
		defer file.Close()

		id, err := fileSvc.UploadDocument(file, header)
		if err != nil {
			writeError(w, 500, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.APIResponse{
			Code:    200,
			Message: fmt.Sprintf("Successfully uploaded: %s (ID: %s)", header.Filename, id),
		})
	}
}
