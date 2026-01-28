package metadata

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// IndexManager manages the mapping between file IDs and symlink names
type IndexManager struct {
	mu       sync.RWMutex
	filePath string
	mapping  map[string]string // ID -> Symlink Name
}

// NewIndexManager creates a new IndexManager
func NewIndexManager(appPath string) *IndexManager {
	return &IndexManager{
		filePath: filepath.Join(appPath, "index.json"),
		mapping:  make(map[string]string),
	}
}

// Load reads the mapping from disk
func (m *IndexManager) Load() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := os.ReadFile(m.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			m.mapping = make(map[string]string)
			return nil
		}
		return err
	}

	return json.Unmarshal(data, &m.mapping)
}

// Save writes the mapping to disk atomically
func (m *IndexManager) Save() error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	data, err := json.MarshalIndent(m.mapping, "", "  ")
	if err != nil {
		return err
	}

	// Atomic write: write to temp file then rename
	tmpFile := m.filePath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return err
	}

	return os.Rename(tmpFile, m.filePath)
}

// Add adds a new mapping and saves
func (m *IndexManager) Add(id, name string) error {
	m.mu.Lock()
	m.mapping[id] = name
	m.mu.Unlock()
	return m.Save()
}

// Remove removes a mapping and saves
func (m *IndexManager) Remove(id string) error {
	m.mu.Lock()
	delete(m.mapping, id)
	m.mu.Unlock()
	return m.Save()
}

// Get returns the symlink name for an ID
func (m *IndexManager) Get(id string) (string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	val, ok := m.mapping[id]
	return val, ok
}

// Rebuild scans the books directory and rebuilds the index
// This handles cases where files were deleted/added externally (e.g. on device UI)
func (m *IndexManager) Rebuild(booksPath string, xochitlPath string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	newMapping := make(map[string]string)

	// List all symlinks in books path
	entries, err := os.ReadDir(booksPath)
	if err != nil {
		return fmt.Errorf("failed to read books directory: %w", err)
	}

	for _, entry := range entries {
		// Determine if it is a symlink
		info, err := entry.Info()
		if err != nil {
			continue
		}

		// Check if it's a symlink
		if info.Mode()&os.ModeSymlink != 0 {
			linkName := entry.Name()
			fullPath := filepath.Join(booksPath, linkName)

			// Read link target
			target, err := os.Readlink(fullPath)
			if err != nil {
				continue
			}

			// Target should be in xochitl path and resemble {ID}.{ext}
			// We only care about the ID part
			targetName := filepath.Base(target)
			ext := filepath.Ext(targetName)
			id := targetName[:len(targetName)-len(ext)]

			// Verify ID looks like a UUID (simple length check or uuid parse)
			if len(id) > 0 {
				newMapping[id] = linkName
			}
		}
	}

	m.mapping = newMapping

	// Release lock temporarily to call Save() which acquires RLock?
	// specific Save implementation takes RLock. Since we hold Lock, we can't call Save directly if it takes lock.
	// Refactor Save to not take lock, or duplicate logic.
	// Let's iterate: internal save helper or just implement save logic here.

	data, err := json.MarshalIndent(m.mapping, "", "  ")
	if err != nil {
		return err
	}

	tmpFile := m.filePath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return err
	}

	return os.Rename(tmpFile, m.filePath)
}
