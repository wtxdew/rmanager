package main

import (
	"log"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/handlers"
)

func main() {
	cfg := config.Load()

	// Check device support
	if !cfg.IsDevMode() && !cfg.IsSupported() {
		log.Fatalf("ERROR: Unsupported device model: %s\n"+
			"This application currently only supports reMarkable Paper Pro (RMPP) and RMPP Move.\n"+
			"Support for reMarkable 2 may be added in the future.",
			cfg.DeviceSpec.Model)
	}

	// Log device information
	if cfg.IsDevMode() {
		log.Println("[DEV] Running in development mode")
		log.Printf("[DEV] Simulating device: %s (%dx%d)",
			cfg.DeviceSpec.Model,
			cfg.DeviceSpec.ScreenWidth,
			cfg.DeviceSpec.ScreenHeight)
	} else {
		log.Printf("[INFO] Detected device: %s", cfg.DeviceSpec.Model)
		log.Printf("[INFO] Screen: %dx%d @ %d PPI",
			cfg.DeviceSpec.ScreenWidth,
			cfg.DeviceSpec.ScreenHeight,
			cfg.DeviceSpec.PPI)
	}

	// Setup routes
	mux := http.NewServeMux()

	// Serve static frontend - using filesystem for now (will embed later)
	mux.Handle("/", http.FileServer(http.Dir("./frontend")))

	// API endpoints
	mux.HandleFunc("/api/status", handlers.GetStatus(cfg))
	mux.HandleFunc("/api/upload-suspend", handlers.UploadSuspendScreen(cfg))
	mux.HandleFunc("/api/current-suspend", handlers.GetCurrentSuspend(cfg))
	mux.HandleFunc("/api/upload-doc", handlers.UploadDocument(cfg))
	mux.HandleFunc("/api/restart-xochitl", handlers.RestartXochitl(cfg))
	mux.HandleFunc("/api/ssh", handlers.HandleWebSSH)

	addr := ":" + cfg.Port
	log.Printf("[INFO] Server starting on http://%s%s", cfg.Host, addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
