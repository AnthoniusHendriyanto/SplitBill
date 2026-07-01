package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/user/split-mate/internal/config"
	delivery "github.com/user/split-mate/internal/delivery/http"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/repository/postgres"
	"github.com/user/split-mate/internal/usecase"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.LoadConfig()
	timeoutContext := time.Duration(120) * time.Second

	pool, err := postgres.NewPostgresConnection(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer pool.Close()

	userRepo := postgres.NewUserRepository(pool)
	billRepo := postgres.NewBillRepository(pool)
	itemRepo := postgres.NewItemRepository(pool)
	personRepo := postgres.NewPersonRepository(pool)
	assignmentRepo := postgres.NewAssignmentRepository(pool)
	paymentRepo := postgres.NewPaymentRepository(pool)
	usageRepo := postgres.NewUsageRepository(pool)
	contactRepo := postgres.NewContactRepository(pool)
	invitationRepo := postgres.NewInvitationRepository(pool)

	runServer(cfg, userRepo, billRepo, itemRepo, personRepo, assignmentRepo, paymentRepo, usageRepo, contactRepo, invitationRepo, postgres.NewOCRService(cfg.GroqAPIKey, cfg.PythonPath), timeoutContext)
}

func runServer(
	cfg *config.Config,
	userRepo domain.UserRepository,
	billRepo domain.BillRepository,
	itemRepo domain.ItemRepository,
	personRepo domain.PersonRepository,
	assignmentRepo domain.AssignmentRepository,
	paymentRepo domain.PaymentRepository,
	usageRepo domain.UsageRepository,
	contactRepo domain.ContactRepository,
	invitationRepo domain.InvitationRepository,
	ocrSvc domain.OCRService,
	timeout time.Duration,
) {
	authUsecase := usecase.NewAuthUsecase(userRepo, cfg)
	billUsecase := usecase.NewBillUsecase(billRepo, itemRepo, personRepo, assignmentRepo, paymentRepo, usageRepo, userRepo, ocrSvc, timeout, cfg.UsageLimit)
	premiumUsecase := usecase.NewPremiumUsecase(userRepo, cfg)

	authHandler := delivery.NewAuthHandler(authUsecase)
	billHandler := delivery.NewBillHandler(billUsecase)
	premiumHandler := delivery.NewPremiumHandler(premiumUsecase, cfg.PremiumCallbackSecret)
	usageHandler := delivery.NewUsageHandler(billUsecase)
	contactUsecase := usecase.NewContactUsecase(contactRepo)
	contactHandler := delivery.NewContactHandler(contactUsecase)
	invitationUsecase := usecase.NewInvitationUsecase(invitationRepo, userRepo, contactRepo)
	invitationHandler := delivery.NewInvitationHandler(invitationUsecase)
	authMiddleware := middleware.NewAuthMiddleware(authUsecase)
	ocrRateLimiter := middleware.NewRateLimiter(10, time.Minute)
	authRateLimiter := middleware.NewRateLimiter(5, time.Minute)
	router := delivery.NewRouter(authHandler, billHandler, premiumHandler, usageHandler, contactHandler, invitationHandler, authMiddleware, ocrRateLimiter, authRateLimiter, cfg.FrontendURL)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.WriteTimeout) * time.Second,
		IdleTimeout:  time.Duration(cfg.IdleTimeout) * time.Second,
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Server panic recovered: %v", r)
			}
		}()
		log.Printf("SplitMate Server starting on port %s...\n", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ocrRateLimiter.Stop()
	authRateLimiter.Stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
