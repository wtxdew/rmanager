package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"rmanager/internal/services"
)

// ListDocuments returns all documents in the file manager
func ListDocuments(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		docs, err := fileSvc.ListDocuments()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, docs, "success")
	}
}

// DeleteDocument marks a document as deleted
func DeleteDocument(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "Missing id parameter")
			return
		}

		err := fileSvc.DeleteDocument(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, nil, "Document deleted successfully")
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
			writeError(w, http.StatusBadRequest, "Invalid request body")
			return
		}

		if req.ID == "" || req.NewName == "" {
			writeError(w, http.StatusBadRequest, "Missing id or newName")
			return
		}

		err := fileSvc.RenameDocument(req.ID, req.NewName)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, nil, "Document renamed successfully")
	}
}

// GetDocumentInfo returns detailed information about a document
func GetDocumentInfo(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "Missing id parameter")
			return
		}

		info, err := fileSvc.GetDocumentInfo(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, info, "success")
	}
}

// SearchDocuments searches documents by query
func SearchDocuments(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")

		docs, err := fileSvc.SearchDocuments(query)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, docs, "success")
	}
}

func UploadDocument(fileSvc *services.FileManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}

		r.ParseMultipartForm(1000 << 20)
		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, http.StatusBadRequest, "Failed to read file")
			return
		}
		defer file.Close()

		id, err := fileSvc.UploadDocument(file, header)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, nil, fmt.Sprintf("Successfully uploaded: %s (ID: %s)", header.Filename, id))
	}
}
