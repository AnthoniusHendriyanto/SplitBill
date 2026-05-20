package config

import (
	"os"
)

type Config struct {
	DBUser              string
	DBPass              string
	DBHost              string
	DBPort              string
	DBName              string
	Port                string
	JWTSecret           string
	JWTExpiration       int
	RefreshTokenExpiry  int
	StripeSecretKey     string
	StripeWebhookSecret string
	GeminiAPIKey        string
	OpenRouterAPIKey    string
}

func LoadConfig() *Config {
	return &Config{
		DBUser:              getEnv("DB_USER", "postgres"),
		DBPass:              getEnv("DB_PASS", "postgres"),
		DBHost:              getEnv("DB_HOST", "localhost"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBName:              getEnv("DB_NAME", "splitmate"),
		Port:                getEnv("PORT", "8080"),
		JWTSecret:           getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpiration:       15,
		RefreshTokenExpiry:  7,
		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		GeminiAPIKey:        getEnv("GEMINI_API_KEY", ""),
		OpenRouterAPIKey:    getEnv("OPENROUTER_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}