package handlers

import (
	"encoding/json"
	"net/http"
	"rmanager/internal/models"
)

func writeJSON(w http.ResponseWriter, code int, data interface{}, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	json.NewEncoder(w).Encode(models.APIResponse{
		Code:    code,
		Message: message,
		Data:    data,
	})
}

func writeError(w http.ResponseWriter, code int, message string) {
	writeJSON(w, code, nil, message)
}
