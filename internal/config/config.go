package config

import (
	"os"
	"strings"
)

// DeviceModel represents the reMarkable device model
type DeviceModel string

const (
	DeviceUnknown  DeviceModel = "unknown"
	DeviceRM2      DeviceModel = "reMarkable 2"         // Not supported yet
	DeviceRMPP     DeviceModel = "reMarkable Paper Pro"
	DeviceRMPPMove DeviceModel = "reMarkable Paper Pro Move"
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
		ScreenWidth:    1872, // TODO: Verify actual specs
		ScreenHeight:   1404, // TODO: Verify actual specs
		PPI:            229,  // TODO: Verify actual PPI
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

		// Use RMPP specs as default for development
		cfg.DeviceSpec = deviceSpecs[DeviceRMPP]
	} else {
		// reMarkable device environment
		cfg.Host = "10.11.99.1"
		cfg.Port = "8080"
		cfg.ScreenPath = "/home/root/test/"
		cfg.BooksPath = "/home/root/books/"
		cfg.XochitlPath = "/home/root/test/xochitl"

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

		switch {
		case strings.Contains(model, "reMarkable 2.0"):
			// RM2 not supported - return error spec
			return DeviceSpec{
				Model:          DeviceRM2,
				ScreenWidth:    0,
				ScreenHeight:   0,
				PPI:            0,
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

		if strings.Contains(strings.ToLower(model), "move") {
			return deviceSpecs[DeviceRMPPMove]
		}
		if strings.Contains(strings.ToLower(model), "pro") {
			return deviceSpecs[DeviceRMPP]
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
	return c.DeviceSpec.Model != DeviceRM2 && c.DeviceSpec.Model != DeviceUnknown
}

// GetScreenDimensions returns screen dimensions for this device
func (c *Config) GetScreenDimensions() (width, height int) {
	return c.DeviceSpec.ScreenWidth, c.DeviceSpec.ScreenHeight
}
