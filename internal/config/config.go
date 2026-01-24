package config

import (
	"os"
	"strings"
)

// DeviceModel represents the reMarkable device model
type DeviceModel string

const (
	DeviceUnknown      DeviceModel = "unknown"
	DeviceRM1          DeviceModel = "reMarkable 1"                // Not supported yet
	DeviceRM2          DeviceModel = "reMarkable 2"                // Not supported yet
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
		ScreenWidth:    1696,
		ScreenHeight:   954,
		PPI:            264,
		SupportedTypes: []string{"pdf", "epub"},
	},
}

type Config struct {
	Host        string
	Port        string
	ScreenPath  string
	BooksPath   string
	XochitlPath string
	DevMode     bool       // Development mode flag
	DeviceSpec  DeviceSpec // Device specifications
}

func Load() *Config {
	cfg := &Config{}

	// Detect environment
	devMode := os.Getenv("DEV_MODE") == "true"
	cfg.DevMode = devMode

	if devMode {
		// Mac development environment - basic testing only
		cfg.Host = "localhost"
		cfg.Port = getEnv("PORT", "8080")
		cfg.ScreenPath = "./testdata/screen"
		cfg.BooksPath = "./testdata/books"
		cfg.XochitlPath = "./testdata/xochitl"

		// Use test platform spec for development
		cfg.DeviceSpec = DeviceSpec{
			Model:          DeviceTestPlatform,
			ScreenWidth:    1620,
			ScreenHeight:   2160,
			PPI:            229,
			SupportedTypes: []string{"pdf", "epub"},
		}
	} else {
		// reMarkable device environment
		cfg.Host = "10.11.99.1"
		cfg.Port = "8080"
		cfg.ScreenPath = "/usr/share/remarkable/"
		cfg.BooksPath = "/home/root/.local/share/remarkable/xochitl/"
		cfg.XochitlPath = "/home/root/.local/share/remarkable/xochitl"

		// Detect actual device model
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
			// RMPP Move codename
			return deviceSpecs[DeviceRMPPMove]
		case strings.Contains(model, "reMarkable 1.0"):
			// RM1 not supported
			return DeviceSpec{
				Model:          DeviceRM1,
				ScreenWidth:    1404,
				ScreenHeight:   1872,
				PPI:            226,
				SupportedTypes: []string{},
			}
		case strings.Contains(model, "reMarkable 2.0"):
			// RM2 not supported
			return DeviceSpec{
				Model:          DeviceRM2,
				ScreenWidth:    1404,
				ScreenHeight:   1872,
				PPI:            226,
				SupportedTypes: []string{},
			}
		case strings.Contains(model, "reMarkable Paper Pro Move"):
			return deviceSpecs[DeviceRMPPMove]
		case strings.Contains(model, "reMarkable Paper Pro"):
			return deviceSpecs[DeviceRMPP]
		}
	}

	// Try alternative detection method using product_name
	if data, err := os.ReadFile("/sys/firmware/devicetree/base/model"); err == nil {
		model := strings.TrimSpace(string(data))
		modelLower := strings.ToLower(model)

		if strings.Contains(modelLower, "chiappa") {
			return deviceSpecs[DeviceRMPPMove]
		}
		if strings.Contains(modelLower, "move") {
			return deviceSpecs[DeviceRMPPMove]
		}
		if strings.Contains(modelLower, "pro") {
			return deviceSpecs[DeviceRMPP]
		}
		if strings.Contains(modelLower, "remarkable 2") {
			return DeviceSpec{
				Model:          DeviceRM2,
				ScreenWidth:    1404,
				ScreenHeight:   1872,
				PPI:            226,
				SupportedTypes: []string{},
			}
		}
		if strings.Contains(modelLower, "remarkable 1") {
			return DeviceSpec{
				Model:          DeviceRM1,
				ScreenWidth:    1404,
				ScreenHeight:   1872,
				PPI:            226,
				SupportedTypes: []string{},
			}
		}
	}

	// Fallback: assume RMPP
	return deviceSpecs[DeviceRMPP]
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// IsDevMode checks if running in development mode
func (c *Config) IsDevMode() bool {
	return c.DevMode
}

// IsSupported checks if the device is supported
func (c *Config) IsSupported() bool {
	return c.DeviceSpec.Model != DeviceRM1 &&
	       c.DeviceSpec.Model != DeviceRM2 &&
	       c.DeviceSpec.Model != DeviceUnknown
}

// GetDeviceDisplayName returns a user-friendly device name with support status
func (c *Config) GetDeviceDisplayName() string {
	switch c.DeviceSpec.Model {
	case DeviceRM1:
		return string(DeviceRM1) + " (not supported yet)"
	case DeviceRM2:
		return string(DeviceRM2) + " (not supported yet)"
	case DeviceTestPlatform:
		return string(DeviceTestPlatform)
	default:
		return string(c.DeviceSpec.Model)
	}
}

// GetScreenDimensions returns screen dimensions for this device
func (c *Config) GetScreenDimensions() (width, height int) {
	return c.DeviceSpec.ScreenWidth, c.DeviceSpec.ScreenHeight
}
