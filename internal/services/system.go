package services

import (
	"log"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
)

// GetSystemInfo retrieves current system information
func GetSystemInfo(cfg *config.Config) (*models.SystemInfo, error) {
	uptime, err := platform.GetUptime(cfg)
	if err != nil {
		log.Printf("Warning: failed to get uptime: %v", err)
		uptime = "Unknown"
	}

	usedBytes, totalBytes, err := platform.GetDiskUsage(cfg, "/home")
	if err != nil {
		log.Printf("Warning: failed to get disk usage: %v", err)
		usedBytes = 0
		totalBytes = 0
	}

	return &models.SystemInfo{
		Uptime:         uptime,
		DiskUsedBytes:  usedBytes,
		DiskTotalBytes: totalBytes,
		Model:          cfg.GetDeviceDisplayName(),
		ScreenWidth:    cfg.DeviceSpec.ScreenWidth,
		ScreenHeight:   cfg.DeviceSpec.ScreenHeight,
	}, nil
}
