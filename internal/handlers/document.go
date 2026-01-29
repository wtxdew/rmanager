package handlers

import (
	"fmt"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/platform"
)

// UploadDocument handles document file uploads

// RestartXochitl handles xochitl UI restart requests
func RestartXochitl(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Restarting xochitl...")
		platform.RestartXochitl(cfg)
		w.Write([]byte("UI restart command sent"))
	}
}
