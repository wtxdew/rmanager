package services

import (
	"fmt"
	"strings"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
)

// GetSystemInfo retrieves current system information
func GetSystemInfo(cfg *config.Config) (*models.SystemInfo, error) {
	uptimeStr, _ := platform.GetUptime(cfg)
	var storageStr string

	used, total, err := platform.GetDiskUsage(cfg, "/home")
	if err != nil {
		storageStr = "Unable to read"
	} else {
		storageStr = fmt.Sprintf("Usage %.2f GB / Total %.2f GB",
			float64(used)/1024/1024/1024,
			float64(total)/1024/1024/1024)
	}

	return &models.SystemInfo{
		Uptime:       strings.TrimSpace(parseUptime(uptimeStr)),
		Storage:      storageStr,
		Model:        cfg.GetDeviceDisplayName(),
		ScreenWidth:  cfg.DeviceSpec.ScreenWidth,
		ScreenHeight: cfg.DeviceSpec.ScreenHeight,
	}, nil
}

func parseUptime(raw string) string {
	if strings.Contains(raw, "up") {
		parts := strings.Split(raw, "up")
		if len(parts) > 1 {
			subParts := strings.Split(parts[1], ",  load")
			return "up" + subParts[0]
		}
	}
	return raw
}
