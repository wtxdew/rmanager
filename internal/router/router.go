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

	// API routes (must be before static files)
	r.Route("/api", func(r chi.Router) {
		// System endpoints
		r.Get("/status", handlers.GetStatus(cfg))
		r.Get("/monitor", handlers.GetMonitorData(cfg))

		// Suspend screen endpoints
		r.Post("/upload-suspend", handlers.UploadSuspendScreen(cfg))
		r.Get("/current-suspend", handlers.GetCurrentSuspend(cfg))

		// Document endpoints
		r.Post("/upload-doc", handlers.UploadDocument(cfg))
		r.Post("/restart-xochitl", handlers.RestartXochitl(cfg))

		// File manager endpoints
		r.Get("/files", handlers.ListDocuments(cfg))
		r.Get("/files/search", handlers.SearchDocuments(cfg))
		r.Get("/files/info", handlers.GetDocumentInfo(cfg))
		r.Delete("/files/delete", handlers.DeleteDocument(cfg))
		r.Put("/files/rename", handlers.RenameDocument(cfg))

		// WebSSH endpoint
		r.Get("/ssh", handlers.HandleWebSSH)
	})

	// Serve static frontend files from web/ directory
	// This must be AFTER API routes
	fs := http.FileServer(http.Dir("./web"))
	r.Handle("/*", fs)

	return r
}
