package handlers

import (
	"log"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/platform"
	"rmanager/internal/services"
)

func GetStatus(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		info, err := services.GetSystemInfo(cfg)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, info, "success")
	}
}

func RestartXochitl(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[INFO] Restarting xochitl requested...")
		err := platform.RestartXochitl(cfg)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, nil, "UI restart command sent")
	}
}

func GetMonitorData(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		data, err := services.GetMonitorData(cfg)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, data, "success")
	}
}
