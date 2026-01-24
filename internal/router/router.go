package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"rmanager/internal/config"
	"rmanager/internal/handlers"
	"rmanager/internal/middleware"
)

// Setup configures and returns the HTTP router with all routes and middleware
func Setup(cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS().Handler)

	// Serve static frontend files from web/ directory
	r.Handle("/*", http.FileServer(http.Dir("./web")))

	// API routes
	r.Route("/api", func(r chi.Router) {
		// System endpoints
		r.Get("/status", handlers.GetStatus(cfg))

		// Suspend screen endpoints
		r.Post("/upload-suspend", handlers.UploadSuspendScreen(cfg))
		r.Get("/current-suspend", handlers.GetCurrentSuspend(cfg))

		// Document endpoints
		r.Post("/upload-doc", handlers.UploadDocument(cfg))
		r.Post("/restart-xochitl", handlers.RestartXochitl(cfg))

		// WebSSH endpoint
		r.Get("/ssh", handlers.HandleWebSSH)
	})

	return r
}
