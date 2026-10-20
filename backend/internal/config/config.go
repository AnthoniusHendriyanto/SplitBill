package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	ResendAPIKey string
	EmailFrom    string
	// DBURL overrides the discrete DB_* fields when set (Supabase pooler URLs).
	DBURL                 string
	DBUser                string
	DBPass                string
	DBHost                string
	DBPort                string
	DBName                string
	DBSSLMode             string
	DBMaxConns            int
	DBMinConns            int
	Port                  string
	FrontendURL           string
	JWTSecret             string
	JWTRefreshSecret      string
	JWTExpiration         int
	RefreshTokenExpiry    int
	GroqAPIKey            string
	GroqVisionModel       string
	ReadTimeout           int
	WriteTimeout          int
	IdleTimeout           int
	PremiumCallbackSecret string
}

func LoadConfig() *Config {
	cfg := &Config{
		ResendAPIKey:          getEnv("RESEND_API_KEY", ""),
		EmailFrom:             getEnv("EMAIL_FROM", ""),
		DBURL:                 getEnv("DATABASE_URL", ""),
		DBUser:                getEnv("DB_USER", "postgres"),
		DBPass:                getEnv("DB_PASS", "postgres"),
		DBHost:                getEnv("DB_HOST", "localhost"),
		DBPort:                getEnv("DB_PORT", "5432"),
		DBName:                getEnv("DB_NAME", "splitmate"),
		DBSSLMode:             getEnv("DB_SSLMODE", "disable"),
		DBMaxConns:            getEnvInt("DB_MAX_CONNS", 25),
		DBMinConns:            getEnvInt("DB_MIN_CONNS", 5),
		Port:                  getEnv("PORT", "8080"),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:5173"),
		JWTSecret:             getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", "your-refresh-secret-key-change-in-production"),
		JWTExpiration:         getEnvInt("JWT_EXPIRATION", 15),
		RefreshTokenExpiry:    getEnvInt("REFRESH_TOKEN_EXPIRY", 7),
		GroqAPIKey:            getEnv("GROQ_API_KEY", ""),
		GroqVisionModel:       getEnv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b"),
		ReadTimeout:           getEnvInt("SERVER_READ_TIMEOUT", 30),
		WriteTimeout:          getEnvInt("SERVER_WRITE_TIMEOUT", 180),
		IdleTimeout:           getEnvInt("SERVER_IDLE_TIMEOUT", 120),
		PremiumCallbackSecret: getEnv("PREMIUM_CALLBACK_SECRET", ""),
	}

	if cfg.JWTSecret == "your-secret-key-change-in-production" {
		log.Println("WARNING: JWT_SECRET is set to default value. Set a strong random secret in production.")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(value); err == nil {
			return n
		}
	}
	return fallback
}
