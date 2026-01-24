package handlers

import (
	"log"
	"net/http"
	"os"
	"os/exec"
	"syscall"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// HandleWebSSH handles WebSocket-based SSH terminal connections
func HandleWebSSH(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}
	defer conn.Close()

	c := exec.Command("/bin/sh", "-i")
	c.Env = append(os.Environ(), "TERM=xterm-256color", "HOME=/home/root", "LC_ALL=en_US.UTF-8")
	c.Dir = "/home/root"

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
		c.Process.Signal(syscall.SIGTERM)
		close(done)
	}()

	<-done
	log.Println("WebSSH session closed.")
}
