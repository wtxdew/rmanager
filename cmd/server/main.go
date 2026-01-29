package main

import (
	"log"
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/metadata"
	"rmanager/internal/router"
)

func main() {
	cfg := config.Load()

	// TODO: Move this check to specific function, not fatal error.
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

	// Sync library to ensure consistency with metadata
	log.Println("[INFO] Syncing library...")
	if err := metadata.SyncLibrary(cfg); err != nil {
		log.Printf("[WARN] Failed to sync library: %v", err)
	}

	// Setup router with middleware
	r := router.Setup(cfg)

	addr := ":" + cfg.Port
	log.Printf("[INFO] Server starting on http://%s%s", cfg.Host, addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
