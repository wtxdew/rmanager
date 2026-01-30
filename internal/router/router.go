package router

import (
	"net/http"

	"rmanager/internal/config"
	"rmanager/internal/handlers"
	"rmanager/internal/middleware"
	"rmanager/internal/services"

	"github.com/go-chi/chi/v5"
)

// Setup configures and returns the HTTP router with all routes and middleware
func Setup(cfg *config.Config) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.Recovery)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS().Handler)

	screenSvc := services.NewScreenService(cfg)

	// API routes (must be before static files)
	r.Route("/api", func(r chi.Router) {
		// System endpoints
		r.Get("/status", handlers.GetStatus(cfg))
		r.Get("/monitor", handlers.GetMonitorData(cfg))

		// Suspend screen endpoints
		r.Post("/upload-suspend", handlers.UploadSuspendScreen(screenSvc))
		r.Get("/current-suspend", handlers.GetCurrentSuspend(screenSvc))
		r.Get("/history-suspend", handlers.GetHistoryLibrary(screenSvc))
		r.Get("/history-suspend/{filename}", handlers.GetHistoryItem(screenSvc))

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

	// Serve static frontend files from React build (web-react/dist/)
	// This must be AFTER API routes
	spaHandler := http.FileServer(http.Dir("./web-react/dist"))
	r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// For SPA routing: if file doesn't exist, serve index.html
		if _, err := http.Dir("./web-react/dist").Open(r.URL.Path); err != nil {
			// File not found, serve index.html for SPA routing
			http.ServeFile(w, r, "./web-react/dist/index.html")
			return
		}
		spaHandler.ServeHTTP(w, r)
	}))

	return r
}
