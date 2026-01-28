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

	// Initialize metadata index
	idx := metadata.NewIndexManager(cfg.AppPath)
	if err := idx.Load(); err != nil {
		log.Printf("[WARN] Failed to load metadata index: %v", err)
	}

	// Rebuild index to ensure consistency with disk
	log.Println("[INFO] Rebuilding metadata index...")
	if err := idx.Rebuild(cfg.BooksPath, cfg.XochitlPath); err != nil {
		log.Printf("[WARN] Failed to rebuild metadata index: %v", err)
	}

	// Setup router with middleware
	r := router.Setup(cfg, idx)

	addr := ":" + cfg.Port
	log.Printf("[INFO] Server starting on http://%s%s", cfg.Host, addr)
	log.Fatal(http.ListenAndServe(addr, r))
}
