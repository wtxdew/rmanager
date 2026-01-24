package services

import (
	"fmt"
	"strings"
	"syscall"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
)

// GetSystemInfo retrieves current system information
func GetSystemInfo(cfg *config.Config) (*models.SystemInfo, error) {
	uptimeStr, _ := platform.GetUptime(cfg)
	uptimePart := parseUptime(uptimeStr)

	storageStr := getStorageInfo()

	return &models.SystemInfo{
		Uptime:  strings.TrimSpace(uptimePart),
		Storage: storageStr,
		Model:   string(cfg.DeviceSpec.Model),
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

func getStorageInfo() string {
	var stat syscall.Statfs_t
	err := syscall.Statfs("/home", &stat)
	if err != nil {
		return "Unable to read"
	}

	all := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	used := all - free

	return fmt.Sprintf("Usage %.2f GB / Total %.2f GB",
		float64(used)/1024/1024/1024,
		float64(all)/1024/1024/1024)
}
