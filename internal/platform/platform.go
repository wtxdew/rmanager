package platform

import (
	"log"
	"os/exec"

	"rmanager/internal/config"
)

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

	return string(out), nil
}
