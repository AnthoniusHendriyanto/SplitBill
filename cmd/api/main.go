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
	"github.com/user/split-mate/internal/repository/memory"
	"github.com/user/split-mate/internal/repository/postgres"
	"github.com/user/split-mate/internal/usecase"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.LoadConfig()
	timeoutContext := time.Duration(120) * time.Second

	// Try PostgreSQL first, fall back to in-memory
	pool, err := postgres.NewPostgresConnection(cfg)
	if err != nil {
		log.Printf("Warning: Could not connect to PostgreSQL: %v", err)
		log.Println("Using in-memory storage")

		repos := memory.NewRepositories()
		ocrSvc := memory.NewOCRService()
		startServer(cfg, repos, ocrSvc, timeoutContext)
		return
	}
	defer pool.Close()
	log.Println("Connected to PostgreSQL Database")

	userRepo := postgres.NewUserRepository(pool)
	billRepo := postgres.NewBillRepository(pool)
	itemRepo := postgres.NewItemRepository(pool)
	personRepo := postgres.NewPersonRepository(pool)
	assignmentRepo := postgres.NewAssignmentRepository(pool)
	paymentRepo := postgres.NewPaymentRepository(pool)
	usageRepo := postgres.NewUsageRepository(pool)

	authUsecase := usecase.NewAuthUsecase(userRepo, cfg)

	ocrService := postgres.NewOCRService(pool)

	billUsecase := usecase.NewBillUsecase(
		billRepo,
		itemRepo,
		personRepo,
		assignmentRepo,
		paymentRepo,
		usageRepo,
		userRepo,
		ocrService,
		timeoutContext,
	)

	authHandler := delivery.NewAuthHandler(authUsecase)
	billHandler := delivery.NewBillHandler(billUsecase)

	authMiddleware := middleware.NewAuthMiddleware(authUsecase)

	router := delivery.NewRouter(authHandler, billHandler, authMiddleware)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 180 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("SplitMate Server starting on port %s...\n", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func startServer(cfg *config.Config, repos *memory.Repositories, ocrSvc domain.OCRService, timeout time.Duration) {
	authUsecase := usecase.NewAuthUsecase(repos.User, cfg)
	billUsecase := usecase.NewBillUsecase(
		repos.Bill,
		repos.Item,
		repos.Person,
		repos.Assignment,
		repos.Payment,
		repos.Usage,
		repos.User,
		ocrSvc,
		timeout,
	)

	authHandler := delivery.NewAuthHandler(authUsecase)
	billHandler := delivery.NewBillHandler(billUsecase)
	authMiddleware := middleware.NewAuthMiddleware(authUsecase)
	router := delivery.NewRouter(authHandler, billHandler, authMiddleware)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 180 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("SplitMate Server (in-memory) starting on port %s...\n", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
