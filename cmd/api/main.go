package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/user/split-mate/internal/config"
	"github.com/user/split-mate/internal/domain"
	delivery "github.com/user/split-mate/internal/delivery/http"
	"github.com/user/split-mate/internal/repository"
	"github.com/user/split-mate/internal/usecase"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	cfg := config.LoadConfig()
	
	// DB Connection
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", 
		cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort, cfg.DBName)
	dbConn, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Println("DB Open Warning:", err)
	}
	if dbConn != nil {
		err = dbConn.Ping()
		if err != nil {
			log.Println("DB Ping Warning:", err)
		}
	}
	if dbConn != nil {
		defer dbConn.Close()
	}

	// Layers
	timeoutContext := time.Duration(10) * time.Second
	var billRepo domain.BillRepository

	if dbConn != nil && dbConn.Ping() == nil {
		log.Println("Connected to MySQL Database")
		billRepo = repository.NewMySQLBillRepository(dbConn)
	} else {
		log.Println("Warning: Falling back to Memory-Based Mock Repository")
		billRepo = repository.NewMockBillRepository()
	}

	billUsecase := usecase.NewBillUsecase(billRepo, timeoutContext)
	billHandler := delivery.NewBillHandler(billUsecase)
	
	ocrService := repository.NewMockOCRService()
	_ = timeoutContext

	// Routes
	http.HandleFunc("/api/v1/bills", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		if r.Method == http.MethodGet {
			billHandler.Fetch(w, r)
		} else if r.Method == http.MethodPost {
			billHandler.Store(w, r)
		}
	})

	http.HandleFunc("/api/v1/ocr", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method == http.MethodPost {
			// Basic OCR endpoint logic (using mock for now)
			res, _ := ocrService.ExtractItems(r.Context(), nil)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(res)
		}
	})

	fmt.Printf("SplitMate Server starting on port %s...\n", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, nil))
}
