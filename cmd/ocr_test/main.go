package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/user/split-mate/internal/config"
	"github.com/user/split-mate/internal/repository/postgres"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: %s <image-path>\n", os.Args[0])
		os.Exit(1)
	}

	imagePath := os.Args[1]

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using env vars")
	}

	cfg := config.LoadConfig()

	imageBytes, err := os.ReadFile(imagePath)
	if err != nil {
		log.Fatalf("Failed to read image: %v", err)
	}

	ocrSvc := postgres.NewOCRService(cfg.GeminiAPIKey, cfg.GroqAPIKey, cfg.PythonPath)

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	start := time.Now()
	result, err := ocrSvc.ExtractItems(ctx, imageBytes)
	elapsed := time.Since(start)
	if err != nil {
		log.Fatalf("OCR failed: %v", err)
	}

	b, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(b))
	fmt.Fprintf(os.Stderr, "\n⏱  Elapsed: %v\n", elapsed)
	fmt.Fprintf(os.Stderr, "✅ Confidence: %.1f%%\n", result.Confidence)
}
