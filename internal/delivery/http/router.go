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
	}).Methods("GET")

	authSub := router.PathPrefix("/api/v1/auth").Subrouter()
	authSub.Use(middleware.BodyLimit(1 << 20))
	authSub.Handle("/register", authRateLimiter.Middleware(http.HandlerFunc(authHandler.Register))).Methods("POST")
	authSub.Handle("/login", authRateLimiter.Middleware(http.HandlerFunc(authHandler.Login))).Methods("POST")
	authSub.HandleFunc("/refresh", authHandler.Refresh).Methods("POST")
	authSub.HandleFunc("/logout", authHandler.Logout).Methods("POST")

	publicAPI := router.PathPrefix("/api/v1").Subrouter()
	publicAPI.Use(middleware.BodyLimit(10 << 20))
	publicAPI.Handle("/ocr", ocrRateLimiter.Middleware(http.HandlerFunc(billHandler.ProcessOCR))).Methods("POST")

	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.Authenticate)
	protected.Use(middleware.BodyLimit(10 << 20))

	protected.Handle("/bills", http.HandlerFunc(billHandler.Fetch)).Methods("GET")
	protected.Handle("/bills", http.HandlerFunc(billHandler.Create)).Methods("POST")

	protected.Handle("/users/me", http.HandlerFunc(authHandler.GetMe)).Methods("GET")
	protected.Handle("/users/me", http.HandlerFunc(authHandler.UpdateMe)).Methods("PUT")

	protected.Handle("/bills/{id}", http.HandlerFunc(billHandler.GetByID)).Methods("GET")
	protected.Handle("/bills/{id}", http.HandlerFunc(billHandler.Delete)).Methods("DELETE")

	protected.HandleFunc("/premium/subscribe", premiumHandler.Subscribe).Methods("POST")
	protected.HandleFunc("/premium/callback", premiumHandler.Callback).Methods("POST")
	protected.HandleFunc("/usage", usageHandler.GetUsage).Methods("GET")

	return middleware.SecurityHeaders(middleware.CORSWithOrigin(frontendURL)(router))
}
