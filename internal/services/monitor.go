package services

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"time"

	"rmanager/internal/config"
	"rmanager/internal/models"
)

// GetMonitorData returns current system monitoring metrics
func GetMonitorData(cfg *config.Config) (*models.MonitorData, error) {
	if cfg.IsDevMode() {
		// Return mock data for development
		return &models.MonitorData{
			CPU:       float64(time.Now().Unix() % 100),
			Memory:    float64(time.Now().Unix() % 80),
			MemUsed:   512,
			MemTotal:  2048,
			Timestamp: time.Now().Unix(),
		}, nil
	}

	cpu := getCPUUsage()
	memUsed, memTotal, memPercent := getMemoryUsage()

	return &models.MonitorData{
		CPU:       cpu,
		Memory:    memPercent,
		MemUsed:   memUsed,
		MemTotal:  memTotal,
		Timestamp: time.Now().Unix(),
	}, nil
}

// getCPUUsage reads CPU usage from /proc/stat
func getCPUUsage() float64 {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return 0.0
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	if !scanner.Scan() {
		return 0.0
	}

	line := scanner.Text()
	if !strings.HasPrefix(line, "cpu ") {
		return 0.0
	}

	fields := strings.Fields(line)
	if len(fields) < 5 {
		return 0.0
	}

	user, _ := strconv.ParseFloat(fields[1], 64)
	nice, _ := strconv.ParseFloat(fields[2], 64)
	system, _ := strconv.ParseFloat(fields[3], 64)
	idle, _ := strconv.ParseFloat(fields[4], 64)

	total := user + nice + system + idle
	if total == 0 {
		return 0.0
	}

	used := user + nice + system
	return (used / total) * 100.0
}

// getMemoryUsage reads memory usage from /proc/meminfo
func getMemoryUsage() (int64, int64, float64) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0, 0.0
	}
	defer file.Close()

	var memTotal, memAvailable int64
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}

		key := strings.TrimSuffix(fields[0], ":")
		value, _ := strconv.ParseInt(fields[1], 10, 64)

		switch key {
		case "MemTotal":
			memTotal = value
		case "MemAvailable":
			memAvailable = value
		}
	}

	if memTotal == 0 {
		return 0, 0, 0.0
	}

	// Convert from KB to MB
	memTotalMB := memTotal / 1024
	memUsedMB := (memTotal - memAvailable) / 1024
	memPercent := float64(memTotal-memAvailable) / float64(memTotal) * 100.0

	return memUsedMB, memTotalMB, memPercent
}
