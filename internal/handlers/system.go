package handlers

import (
	"encoding/json"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/services"
)

func GetStatus(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		info, err := services.GetSystemInfo(cfg)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(info)
	}
}
