package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"rmanager/internal/config"
	"rmanager/internal/metadata"
	"rmanager/internal/models"
	"rmanager/internal/platform"

	"github.com/google/uuid"
)

// UploadDocument handles document file uploads
func UploadDocument(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		r.ParseMultipartForm(100 << 20)
		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "Failed to read the file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		id := uuid.New().String()
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext != ".pdf" && ext != ".epub" {
			http.Error(w, "Only support PDF/EPUB", http.StatusBadRequest)
			return
		}
		baseName := strings.TrimSuffix(header.Filename, ext)

		targetFile := filepath.Join(cfg.XochitlPath, id+ext)
		dst, err := os.Create(targetFile)
		if err != nil {
			http.Error(w, "Failed to create the file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		io.Copy(dst, file)

		// Create symlink
		linkName := header.Filename
		linkPath := filepath.Join(cfg.BooksPath, linkName)
		if err := os.Symlink(targetFile, linkPath); err != nil {
			fmt.Printf("Failed to create symlink: %v\n", err)
		}

		// Create metadata
		meta := &models.RmMetadata{
			Deleted:      false,
			LastModified: fmt.Sprintf("%d000", time.Now().Unix()),
			Type:         "DocumentType",
			Version:      1,
			VisibleName:  baseName,
		}

		if err := metadata.SaveMetadata(cfg.XochitlPath, id, meta); err != nil {
			fmt.Printf("Failed to save metadata: %v\n", err)
			// Should probably return error here but for consistency with previous flow:
		}

		// Create content file
		contentJson := ""
		if ext == ".pdf" {
			contentJson = `{"extraMetadata":{},"fileType":"pdf","fontName":"","lastOpenedPage":0,"lineHeight":-1,"margins":100,"pageCount":1,"textScale":1,"transform":{"m11":1,"m12":1,"m13":1,"m21":1,"m22":1,"m23":1,"m31":1,"m32":1,"m33":1}}`
			os.MkdirAll(filepath.Join(cfg.XochitlPath, id+".cache"), 0755)
			os.MkdirAll(filepath.Join(cfg.XochitlPath, id+".highlights"), 0755)
			os.MkdirAll(filepath.Join(cfg.XochitlPath, id+".thumbnails"), 0755)
		} else {
			contentJson = `{"fileType":"epub"}`
		}
		os.WriteFile(filepath.Join(cfg.XochitlPath, id+".content"), []byte(contentJson), 0644)

		fmt.Fprintf(w, "Successfully uploaded document: %s (ID: %s)", baseName, id)
	}
}

// RestartXochitl handles xochitl UI restart requests
func RestartXochitl(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Restarting xochitl...")
		platform.RestartXochitl(cfg)
		w.Write([]byte("UI restart command sent"))
	}
}
