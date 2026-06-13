package http

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
)

func NewRouter(
	authHandler *AuthHandler,
	billHandler *BillHandler,
	premiumHandler *PremiumHandler,
	usageHandler *UsageHandler,
	authMiddleware *middleware.AuthMiddleware,
	ocrRateLimiter *middleware.RateLimiter,
	authRateLimiter *middleware.RateLimiter,
	frontendURL string,
) http.Handler {
	router := mux.NewRouter()

	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(domain.NewSuccess(map[string]string{"status": "ok"}))
	}).Methods("GET", "OPTIONS")

	authSub := router.PathPrefix("/api/v1/auth").Subrouter()
	authSub.Use(middleware.BodyLimit(1 << 20))
	authSub.Handle("/register", authRateLimiter.Middleware(http.HandlerFunc(authHandler.Register))).Methods("POST", "OPTIONS")
	authSub.Handle("/login", authRateLimiter.Middleware(http.HandlerFunc(authHandler.Login))).Methods("POST", "OPTIONS")
	authSub.HandleFunc("/refresh", authHandler.Refresh).Methods("POST", "OPTIONS")
	authSub.HandleFunc("/logout", authHandler.Logout).Methods("POST", "OPTIONS")

	publicAPI := router.PathPrefix("/api/v1").Subrouter()
	publicAPI.Use(middleware.BodyLimit(10 << 20))
	publicAPI.Handle("/ocr", ocrRateLimiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method == http.MethodPost {
			billHandler.ProcessOCR(w, r)
		}
	}))).Methods("POST", "OPTIONS")

	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.Authenticate)
	protected.Use(middleware.BodyLimit(10 << 20))

	protected.HandleFunc("/bills", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		switch r.Method {
		case http.MethodGet:
			billHandler.Fetch(w, r)
		case http.MethodPost:
			billHandler.Create(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}).Methods("GET", "POST", "OPTIONS")

	protected.HandleFunc("/users/me", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		switch r.Method {
		case http.MethodGet:
			authHandler.GetMe(w, r)
		case http.MethodPut:
			authHandler.UpdateMe(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}).Methods("GET", "PUT", "OPTIONS")

	protected.HandleFunc("/bills/{id}", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		switch r.Method {
		case http.MethodGet:
			billHandler.GetByID(w, r)
		case http.MethodDelete:
			billHandler.Delete(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}).Methods("GET", "DELETE", "OPTIONS")

	protected.HandleFunc("/premium/subscribe", premiumHandler.Subscribe).Methods("POST", "OPTIONS")
	protected.HandleFunc("/premium/callback", premiumHandler.Callback).Methods("POST", "OPTIONS")
	protected.HandleFunc("/usage", usageHandler.GetUsage).Methods("GET", "OPTIONS")

	return middleware.SecurityHeaders(middleware.CORSWithOrigin(frontendURL)(router))
}
