package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	"image/png"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
    "log"

	"github.com/google/uuid"
	"golang.org/x/image/draw"
    "github.com/creack/pty"
    "github.com/gorilla/websocket"
)

// const XochitlPath = "/home/root/.local/share/remarkable/xochitl/"
const screenPath = "/home/root/test/"
const BooksPath = "/home/root/books/"
const XochitlPath = "/home/root/test/xochitl"

//go:embed frontend/*
var content embed.FS

type SystemInfo struct {
	Uptime  string `json:"uptime"`
	Storage string `json:"storage"`
	Model   string `json:"model"`
}

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

func main() {
	frontendFS, _ := fs.Sub(content, "frontend")
	http.Handle("/", http.FileServer(http.FS(frontendFS)))

	http.HandleFunc("/api/status", getStatus)
	http.HandleFunc("/api/upload-suspend", handleUpload)
	http.HandleFunc("/api/current-suspend", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		http.ServeFile(w, r, screenPath+"/suspended.png")
	})
	http.HandleFunc("/api/upload-doc", handleDocumentUpload)
	http.HandleFunc("/api/restart-xochitl", handleRestartXochitl)
	http.HandleFunc("/api/ssh", handleWebSSH)

	fmt.Println("Server Running at: http://10.11.99.1:8080")
	http.ListenAndServe(":8080", nil)
}

func handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST Support ONLY", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(10 << 20)
	file, _, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Failed to read the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	exec.Command("mount", "-o", "remount,rw", "/").Run()

	dst, err := os.Create(screenPath + "/suspended.png")
	if err != nil {
		exec.Command("mount", "-o", "remount,ro", "/").Run()
		http.Error(w, "Unable to write on the System mount: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	processedImg, err := processImage(file)
	if err != nil {
		http.Error(w, "Failed to process the image: "+err.Error(), http.StatusInternalServerError)
		return
	}

	png.Encode(dst, processedImg)

	exec.Command("mount", "-o", "remount,ro", "/").Run()

	fmt.Fprint(w, "Success change the suspended screen！")
}

func getStatus(w http.ResponseWriter, r *http.Request) {
	out, _ := exec.Command("uptime").Output()
	rawUptime := string(out)
	uptimePart := rawUptime
	if strings.Contains(rawUptime, "up") {
		parts := strings.Split(rawUptime, "up")
		if len(parts) > 1 {
			subParts := strings.Split(parts[1], ",  load")
			uptimePart = "up" + subParts[0]
		}
	}

	var stat syscall.Statfs_t
	err := syscall.Statfs("/home", &stat)
	storageStr := "Unable to read"
	if err == nil {
		all := stat.Blocks * uint64(stat.Bsize)
		free := stat.Bavail * uint64(stat.Bsize)
		used := all - free

		storageStr = fmt.Sprintf("Usage %.2f GB / Total %.2f GB",
			float64(used)/1024/1024/1024,
			float64(all)/1024/1024/1024)
	}

	info := SystemInfo{
		Uptime:  strings.TrimSpace(uptimePart),
		Storage: storageStr,
		Model:   "reMarkable Paper Pro",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

func handleDocumentUpload(w http.ResponseWriter, r *http.Request) {
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

	targetFile := filepath.Join(XochitlPath, id+ext)
	dst, err := os.Create(targetFile)
	linkName := filepath.Join(BooksPath, header.Filename)
	if err != nil {
		http.Error(w, "Failed to create the file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	io.Copy(dst, file)
	if err := os.Symlink(targetFile, linkName); err != nil {
		fmt.Printf("Failed to create symlink: %v\n", err)
		// We don't return error to user because the main upload was successful
	} else {
		fmt.Printf("Symlink created: %s -> %s\n", linkName, targetFile)
	}

	meta := RmMetadata{
		Deleted:      false,
		LastModified: fmt.Sprintf("%d000", time.Now().Unix()),
		Type:         "DocumentType",
		Version:      1,
		VisibleName:  baseName,
	}
	metaJson, _ := json.Marshal(meta)
	os.WriteFile(filepath.Join(XochitlPath, id+".metadata"), metaJson, 0644)

	contentJson := ""
	if ext == ".pdf" {
		contentJson = `{"extraMetadata":{},"fileType":"pdf","fontName":"","lastOpenedPage":0,"lineHeight":-1,"margins":100,"pageCount":1,"textScale":1,"transform":{"m11":1,"m12":1,"m13":1,"m21":1,"m22":1,"m23":1,"m31":1,"m32":1,"m33":1}}`
		os.MkdirAll(filepath.Join(XochitlPath, id+".cache"), 0755)
		os.MkdirAll(filepath.Join(XochitlPath, id+".highlights"), 0755)
		os.MkdirAll(filepath.Join(XochitlPath, id+".thumbnails"), 0755)
	} else {
		contentJson = `{"fileType":"epub"}`
	}
	os.WriteFile(filepath.Join(XochitlPath, id+".content"), []byte(contentJson), 0644)

	fmt.Fprintf(w, "Successfully upload document: %s (ID: %s)", baseName, id)
}

func handleRestartXochitl(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Restarting the Xochitl ...")
	exec.Command("systemctl", "restart", "xochitl").Run()
	w.Write([]byte("UI Already send the restart command"))
}

func processImage(src io.Reader) (image.Image, error) {
	img, _, err := image.Decode(src)
	if err != nil {
		return nil, err
	}

	const targetW, targetH = 1620, 2160
	srcBounds := img.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	var cropRect image.Rectangle
	if float64(srcW)/float64(srcH) > float64(targetW)/float64(targetH) {
		newW := srcH * targetW / targetH
		offset := (srcW - newW) / 2
		cropRect = image.Rect(offset, 0, offset+newW, srcH)
	} else {
		newH := srcW * targetH / targetW
		offset := (srcH - newH) / 2
		cropRect = image.Rect(0, offset, srcW, offset+newH)
	}

	dst := image.NewRGBA(image.Rect(0, 0, targetW, targetH))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, cropRect, draw.Over, nil)

	return dst, nil
}
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // 類似於 CORS 的 Access-Control-Allow-Origin: *
    },
}

func handleWebSSH(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// 1. 指定 Shell 與環境變數
	c := exec.Command("/bin/sh", "-i")
	c.Env = append(os.Environ(), "TERM=xterm-256color", "HOME=/home/root", "LC_ALL=en_US.UTF-8")
	c.Dir = "/home/root"

	// 2. 關鍵：初始化 PTY 尺寸 (不可為 0)
	// 許多嵌入式 Shell 看到 0x0 會直接結束
	f, err := pty.StartWithAttrs(c, &pty.Winsize{Rows: 24, Cols: 80}, nil)
	if err != nil {
		log.Printf("PTY Start error: %v", err)
		return
	}
	defer f.Close()

	log.Printf("Shell started: PID %d", c.Process.Pid)

	done := make(chan struct{})

	// PTY -> WebSocket
	go func() {
		buf := make([]byte, 2048)
		for {
			n, err := f.Read(buf)
			if err != nil {
				log.Printf("PTY Read EOF or Error: %v", err)
				// 如果是 EOF，代表遠端 Shell 真的退出了
				break
			}
			conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		}
		close(done)
	}()

	// WebSocket -> PTY
	go func() {
		for {
			mt, msg, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket Closed: %v", err)
				break
			}
			if mt == websocket.BinaryMessage || mt == websocket.TextMessage {
				f.Write(msg)
			}
		}
		// 當網頁關閉時，主動殺掉 Shell 進程 (類似 C++ 的 kill)
		c.Process.Signal(syscall.SIGTERM)
		close(done)
	}()

	<-done
	log.Println("WebSSH session closed.")
}
