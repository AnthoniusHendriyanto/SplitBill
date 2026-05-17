package http

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
)

func NewRouter(
	authHandler *AuthHandler,
	billHandler *BillHandler,
	authMiddleware *middleware.AuthMiddleware,
) http.Handler {
	router := mux.NewRouter()

	router.HandleFunc("/api/v1/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/v1/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/v1/auth/refresh", authHandler.Refresh).Methods("POST", "OPTIONS")

	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.Authenticate)

	protected.HandleFunc("/bills", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
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

	protected.HandleFunc("/bills/{id}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
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

	protected.HandleFunc("/ocr", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method == http.MethodPost {
			billHandler.ProcessOCR(w, r)
		}
	}).Methods("POST", "OPTIONS")

	return middleware.CORS(router)
}