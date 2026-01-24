package handlers

import (
	"encoding/json"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/services"
)

// GetMonitorData returns current monitoring metrics
func GetMonitorData(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := services.GetMonitorData(cfg)
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
			Data:    data,
		})
	}
}
