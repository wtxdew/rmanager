package services

import (
	"time"

	"rmanager/internal/config"
	"rmanager/internal/models"
	"rmanager/internal/platform"
)

// GetMonitorData returns current system monitoring metrics
func GetMonitorData(cfg *config.Config) (*models.MonitorData, error) {
	cpu := platform.GetCPULoad(cfg)
	memUsed, memTotal, memPercent := platform.GetMemoryStats(cfg)

	return &models.MonitorData{
		CPU:       cpu,
		Memory:    memPercent,
		MemUsed:   memUsed,
		MemTotal:  memTotal,
		Timestamp: time.Now().Unix(),
	}, nil
}
