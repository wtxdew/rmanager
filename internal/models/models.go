package models

// SystemInfo represents system status information
type SystemInfo struct {
	Uptime         string `json:"uptime"`
	DiskUsedBytes  uint64 `json:"diskUsedBytes"`
	DiskTotalBytes uint64 `json:"diskTotalBytes"`
	Model          string `json:"model"`
	CPU            string `json:"cpu,omitempty"`
	Memory         string `json:"memory,omitempty"`
	ScreenWidth    int    `json:"screenWidth"`
	ScreenHeight   int    `json:"screenHeight"`
}

// RmMetadata represents reMarkable document metadata
type RmMetadata struct {
	Deleted          bool   `json:"deleted"`
	LastModified     string `json:"lastModified"`
	MetadataModified bool   `json:"metadatamodified"`
	Modified         bool   `json:"modified"`
	Parent           string `json:"parent"`
	Pinned           bool   `json:"pinned"`
	Synced           bool   `json:"synced"`
	Type             string `json:"type"`
	Version          int    `json:"version"`
	VisibleName      string `json:"visibleName"`
}

type RmContent struct {
	FileType      string                 `json:"fileType"` // pdf, epub, notebook
	ExtraMetadata map[string]interface{} `json:"extraMetadata,omitempty"`
	FontName      string                 `json:"fontName,omitempty"`
	LineHeight    int                    `json:"lineHeight,omitempty"`
	PageCount     int                    `json:"pageCount,omitempty"`
	TextScale     int                    `json:"textScale,omitempty"`
}

// DocumentFile represents a file in the file manager
type DocumentFile struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Type         string `json:"type"`
	Size         int64  `json:"size"`
	ModifiedTime string `json:"modifiedTime"`
	Pinned       bool   `json:"pinned"`
	Parent       string `json:"parent"`
}

// DocumentInfo represents detailed document information
type DocumentInfo struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Type         string `json:"type"`
	Size         int64  `json:"size"`
	Path         string `json:"path"`
	ModifiedTime string `json:"modifiedTime"`
	Pinned       bool   `json:"pinned"`
	Parent       string `json:"parent"`
	PageCount    int    `json:"pageCount"`
	Deleted      bool   `json:"deleted"`
}

// APIResponse represents a standard API response
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// MonitorData represents real-time monitoring metrics
type MonitorData struct {
	CPU       float64 `json:"cpu"`       // CPU usage percentage
	Memory    float64 `json:"memory"`    // Memory usage percentage
	MemUsed   int64   `json:"memUsed"`   // Memory used in MB
	MemTotal  int64   `json:"memTotal"`  // Total memory in MB
	Timestamp int64   `json:"timestamp"` // Unix timestamp
}

// SuspendHistoryItem represents a suspend screen history item
type SuspendHistoryItem struct {
	Filename string `json:"filename"`
	Url      string `json:"url"`
}
