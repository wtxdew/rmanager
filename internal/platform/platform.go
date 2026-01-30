package platform

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"time"

	"rmanager/internal/config"
)

// ==========================================
// Command Execution (基于命令的操作)
// ==========================================

// Mount remounts the root filesystem with specified mode
// Only executes on actual reMarkable device
func Mount(cfg *config.Config, mode string) error {
	if cfg.IsDevMode() {
		log.Printf("[DEV] Skipping mount operation (mode: %s)", mode)
		return nil
	}

	return exec.Command("mount", "-o", "remount,"+mode, "/").Run()
}

// RestartXochitl restarts the xochitl UI service
// Only executes on actual reMarkable device
func RestartXochitl(cfg *config.Config) error {
	if cfg.IsDevMode() {
		log.Println("[DEV] Skipping xochitl restart (not on device)")
		return nil
	}

	return exec.Command("systemctl", "restart", "xochitl").Run()
}

// GetUptime returns system uptime
// Returns mock data in development mode
func GetUptime(cfg *config.Config) (string, error) {
	if cfg.IsDevMode() {
		return "Development mode - uptime unavailable", nil
	}

	out, err := exec.Command("uptime").Output()
	if err != nil {
		return "", err
	}
	raw := string(out)

	if strings.Contains(raw, "up") {
		parts := strings.Split(raw, "up")
		if len(parts) > 1 {
			content := parts[1]
			if idx := strings.Index(content, "load"); idx != -1 {
				content = content[:idx]
			}
			return "up " + strings.Trim(content, ", \n"), nil
		}
	}

	return strings.TrimSpace(raw), nil
}

// ==========================================
// System Calls
// ==========================================

// GetDiskUsage returns disk usage for the given path
func GetDiskUsage(cfg *config.Config, path string) (uint64, uint64, error) {
	if cfg.IsDevMode() {
		return 10 * 1024 * 1024 * 1024, 32 * 1024 * 1024 * 1024, nil
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, 0, err
	}

	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	used := total - free

	return used, total, nil
}

// GetCPULoad Read /proc/stat to calculate CPU usage
func GetCPULoad(cfg *config.Config) float64 {
	if cfg.IsDevMode() {
		return float64(time.Now().Unix() % 100)
	}

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

// GetMemoryStats Read /proc/meminfo
// Return: usedMB, totalMB, percentage
func GetMemoryStats(cfg *config.Config) (int64, int64, float64) {
	if cfg.IsDevMode() {
		// Mock data: 2048MB total, 512MB used
		return 512, 2048, float64(time.Now().Unix() % 80)
	}

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

func CheckIsFile(path string) (bool, error) {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if info.IsDir() {
		return false, nil
	}
	return true, nil
}

func GetLinkCount(path string) int {
	fi, err := os.Stat(path)
	if err != nil {
		return 0
	}
	stat, ok := fi.Sys().(*syscall.Stat_t)
	if !ok {
		return 0
	}
	return int(stat.Nlink)
}

func GetInode(path string) (uint64, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	stat, ok := fileInfo.Sys().(*syscall.Stat_t)
	if !ok {
		return 0, fmt.Errorf("not a unix system")
	}
	return stat.Ino, nil
}
