package http

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
)

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("PANIC recovered: %v", rec)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(domain.NewError("INTERNAL_ERROR", "An unexpected error occurred", nil))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func NewRouter(
	authHandler *AuthHandler,
	billHandler *BillHandler,
	premiumHandler *PremiumHandler,
	usageHandler *UsageHandler,
	contactHandler *ContactHandler,
	invitationHandler *InvitationHandler,
	groupHandler *GroupHandler,
	recurrenceHandler *RecurrenceHandler,
	importHandler *ImportHandler,
	notificationHandler *NotificationHandler,
	authMiddleware *middleware.AuthMiddleware,
	ocrRateLimiter *middleware.RateLimiter,
	shareRateLimiter *middleware.RateLimiter,
	authRateLimiter *middleware.RateLimiter,
	frontendURL string,
) http.Handler {
	router := mux.NewRouter()
	router.Use(recoveryMiddleware)
	router.Use(middleware.RequestID)

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
	publicAPI.Handle("/shared/{token}", shareRateLimiter.Middleware(http.HandlerFunc(billHandler.Shared))).Methods("GET")

	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.Authenticate)
	protected.Use(middleware.BodyLimit(16 << 20))
	protected.Use(middleware.ContentTypeValidator)

	protected.Handle("/bills", http.HandlerFunc(billHandler.Fetch)).Methods("GET")
	protected.HandleFunc("/notifications", notificationHandler.List).Methods("GET")
	protected.HandleFunc("/notifications/{id}/read", notificationHandler.Read).Methods("PATCH")
	protected.HandleFunc("/debts", notificationHandler.Debts).Methods("GET")
	protected.HandleFunc("/settlements", notificationHandler.Settlements).Methods("GET")
	protected.Handle("/bills", http.HandlerFunc(billHandler.Create)).Methods("POST")

	protected.Handle("/users/me", http.HandlerFunc(authHandler.GetMe)).Methods("GET")
	protected.Handle("/users/me", http.HandlerFunc(authHandler.UpdateMe)).Methods("PUT")

	protected.Handle("/bills/{id}", http.HandlerFunc(billHandler.GetByID)).Methods("GET")
	protected.Handle("/bills/{id}", http.HandlerFunc(billHandler.Delete)).Methods("DELETE")
	protected.Handle("/bills/{id}/status", http.HandlerFunc(billHandler.UpdateStatus)).Methods("PATCH")
	protected.Handle("/bills/{id}/payments/{personId}", http.HandlerFunc(billHandler.MarkPersonPaid)).Methods("PATCH")
	protected.Handle("/bills/{id}/share", http.HandlerFunc(billHandler.CreateShare)).Methods("POST")
	protected.Handle("/bills/{id}/share", http.HandlerFunc(billHandler.RevokeShare)).Methods("DELETE")
	protected.Handle("/bills/{id}/receipt", http.HandlerFunc(billHandler.Receipt)).Methods("GET")

	protected.Handle("/groups", http.HandlerFunc(groupHandler.List)).Methods("GET")
	protected.Handle("/groups", http.HandlerFunc(groupHandler.Create)).Methods("POST")
	protected.Handle("/groups/{id}", http.HandlerFunc(groupHandler.Detail)).Methods("GET")
	protected.Handle("/groups/{id}", http.HandlerFunc(groupHandler.Delete)).Methods("DELETE")
	protected.Handle("/groups/{id}/members", http.HandlerFunc(groupHandler.AddMember)).Methods("POST")
	protected.Handle("/groups/{id}/members/{memberId}", http.HandlerFunc(groupHandler.RemoveMember)).Methods("DELETE")
	protected.Handle("/groups/{id}/bills/{billId}", http.HandlerFunc(groupHandler.AttachBill)).Methods("POST")
	protected.Handle("/groups/{id}/default-split", http.HandlerFunc(groupHandler.DefaultSplit)).Methods("GET", "PUT")

	protected.Handle("/recurrences", http.HandlerFunc(recurrenceHandler.List)).Methods("GET")
	protected.Handle("/recurrences", http.HandlerFunc(recurrenceHandler.Create)).Methods("POST")
	protected.Handle("/recurrences/{id}/status", http.HandlerFunc(recurrenceHandler.SetStatus)).Methods("PATCH")
	protected.Handle("/imports/splitwise", http.HandlerFunc(importHandler.Splitwise)).Methods("POST")

	protected.HandleFunc("/premium/subscribe", premiumHandler.Subscribe).Methods("POST")
	protected.HandleFunc("/premium/callback", premiumHandler.Callback).Methods("POST")
	protected.HandleFunc("/usage", usageHandler.GetUsage).Methods("GET")

	protected.Handle("/contacts", http.HandlerFunc(contactHandler.List)).Methods("GET")
	protected.Handle("/contacts", http.HandlerFunc(contactHandler.Create)).Methods("POST")
	protected.Handle("/contacts/{id}", http.HandlerFunc(contactHandler.Delete)).Methods("DELETE")

	protected.Handle("/invitations", http.HandlerFunc(invitationHandler.Send)).Methods("POST")
	protected.Handle("/invitations", http.HandlerFunc(invitationHandler.List)).Methods("GET")
	protected.Handle("/invitations/{id}/accept", http.HandlerFunc(invitationHandler.Accept)).Methods("POST")
	protected.Handle("/invitations/{id}/reject", http.HandlerFunc(invitationHandler.Reject)).Methods("POST")

	protected.Handle("/bills/{id}", http.HandlerFunc(billHandler.Update)).Methods("PUT")

	return middleware.SecurityHeaders(middleware.CORSWithOrigin(frontendURL)(router))
}
