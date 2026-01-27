package config

import (
	"os"
	"strings"
)

// DeviceModel represents the reMarkable device model
type DeviceModel string

const (
	DeviceUnknown      DeviceModel = "unknown"
	DeviceRM1          DeviceModel = "reMarkable 1" // Not supported yet
	DeviceRM2          DeviceModel = "reMarkable 2" // Not supported yet
	DeviceRMPP         DeviceModel = "reMarkable Paper Pro"
	DeviceRMPPMove     DeviceModel = "reMarkable Paper Pro Move"
	DeviceTestPlatform DeviceModel = "Test Platform (Mac/Linux)"
)

// DeviceSpec contains device-specific specifications
type DeviceSpec struct {
	Model          DeviceModel
	ScreenWidth    int
	ScreenHeight   int
	PPI            int
	SupportedTypes []string
}

var deviceSpecs = map[DeviceModel]DeviceSpec{
	DeviceRMPP: {
		Model:          DeviceRMPP,
		ScreenWidth:    1620,
		ScreenHeight:   2160,
		PPI:            229,
		SupportedTypes: []string{"pdf", "epub"},
	},
	DeviceRMPPMove: {
		Model:          DeviceRMPPMove,
		ScreenWidth:    954,
		ScreenHeight:   1696,
		PPI:            264,
		SupportedTypes: []string{"pdf", "epub"},
	},
	DeviceRM2: {
		Model:          DeviceRM2,
		ScreenWidth:    1404,
		ScreenHeight:   1872,
		PPI:            226,
		SupportedTypes: []string{"pdf", "epub"},
	},
	DeviceRM1: {
		Model:          DeviceRM1,
		ScreenWidth:    1404,
		ScreenHeight:   1872,
		PPI:            226,
		SupportedTypes: []string{"pdf", "epub"},
	},
}

type Config struct {
	Host        string
	Port        string
	ScreenPath  string
	BooksPath   string
	HistoryPath string
	XochitlPath string
	DevMode     bool       // Development mode flag
	DeviceSpec  DeviceSpec // Device specifications
}

func Load() *Config {
	cfg := &Config{}

	devMode := os.Getenv("DEV_MODE") == "true"
	cfg.DevMode = devMode

	if devMode {
		// Mac development environment - basic testing only
		cfg.Host = "localhost"
		cfg.Port = getEnv("PORT", "8080")
		cfg.ScreenPath = "./testdata/screen"
		cfg.BooksPath = "./testdata/books"
		cfg.XochitlPath = "./testdata/xochitl"
		cfg.HistoryPath = "./testdata/history"

		// Use test platform spec for development
		cfg.DeviceSpec = DeviceSpec{
			Model:          DeviceTestPlatform,
			ScreenWidth:    954,
			ScreenHeight:   1696,
			PPI:            264,
			SupportedTypes: []string{"pdf", "epub"},
		}
	} else {
		// reMarkable device environment
		cfg.Host = "10.11.99.1"
		cfg.Port = "8080"
		cfg.ScreenPath = "/usr/share/remarkable/"
		cfg.XochitlPath = "/home/root/.local/share/remarkable/xochitl"
		cfg.HistoryPath = "/home/root/rm-manager/history/"
		cfg.BooksPath = "/home/root/rm-manager/books/"

		cfg.DeviceSpec = detectDevice()
	}

	return cfg
}

// detectDevice detects the reMarkable device model
func detectDevice() DeviceSpec {
	// Try to read device model from codename file
	if data, err := os.ReadFile("/sys/devices/soc0/machine"); err == nil {
		model := strings.TrimSpace(string(data))
		modelLower := strings.ToLower(model)

		switch {
		case strings.Contains(modelLower, "chiappa"):
			return deviceSpecs[DeviceRMPPMove]
		case strings.Contains(modelLower, "ferrari"):
			return deviceSpecs[DeviceRMPP]
		case strings.Contains(modelLower, "rm1"):
			return deviceSpecs[DeviceRM1]
		case strings.Contains(modelLower, "rm2"):
			return deviceSpecs[DeviceRM2]
		}
	}

	// Try alternative detection method using product_name
	if data, err := os.ReadFile("/sys/firmware/devicetree/base/model"); err == nil {
		model := strings.TrimSpace(string(data))
		modelLower := strings.ToLower(model)

		if strings.Contains(modelLower, "chiappa") {
			return deviceSpecs[DeviceRMPPMove]
		}
		if strings.Contains(modelLower, "ferrari") {
			return deviceSpecs[DeviceRMPP]
		}
		if strings.Contains(modelLower, "rm2") {
			return deviceSpecs[DeviceRM2]
		}
		if strings.Contains(modelLower, "rm1") {
			return deviceSpecs[DeviceRM1]
		}
	}

	return deviceSpecs[DeviceUnknown]
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func (c *Config) IsDevMode() bool {
	return c.DevMode
}

func (c *Config) IsSupported() bool {
	return c.DeviceSpec.Model != DeviceRM1 &&
		c.DeviceSpec.Model != DeviceRM2 &&
		c.DeviceSpec.Model != DeviceUnknown
}

func (c *Config) GetDeviceDisplayName() string {
	switch c.DeviceSpec.Model {
	case DeviceRM1:
		return string(DeviceRM1) + " (not supported yet)"
	case DeviceRM2:
		return string(DeviceRM2) + " (not supported yet)"
	case DeviceTestPlatform:
		return string(DeviceTestPlatform)
	case DeviceUnknown:
		return string(DeviceUnknown) + " (not supported)"
	default:
		return string(c.DeviceSpec.Model)
	}
}

func (c *Config) GetScreenDimensions() (width, height int) {
	return c.DeviceSpec.ScreenWidth, c.DeviceSpec.ScreenHeight
}
