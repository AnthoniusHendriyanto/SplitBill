package usecase

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/user/split-mate/internal/config"
	"github.com/user/split-mate/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type authUsecase struct {
	userRepo domain.UserRepository
	cfg      *config.Config
}

const bcryptCost = 12

func NewAuthUsecase(userRepo domain.UserRepository, cfg *config.Config) AuthUsecase {
	return &authUsecase{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (u *authUsecase) Register(ctx context.Context, req *domain.RegisterRequest) (*domain.AuthResponse, error) {
	existingUser, _ := u.userRepo.GetByEmail(ctx, req.Email)
	if existingUser.ID != "" {
		return nil, domain.ErrAlreadyExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	req.Email = strings.ToLower(req.Email)
	user := &domain.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		Tier:         "free",
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	accessToken, refreshToken, expiresAt, err := u.generateTokens(user.ID)
	if err != nil {
		return nil, err
	}

	if err := u.userRepo.SaveRefreshToken(ctx, user.ID, refreshToken, expiresAt); err != nil {
		log.Printf("failed to save refresh token: %v", err)
	}

	return &domain.AuthResponse{
		User: domain.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Tier:      user.Tier,
			CreatedAt: user.CreatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *authUsecase) Login(ctx context.Context, req *domain.LoginRequest) (*domain.AuthResponse, error) {
	req.Email = strings.ToLower(req.Email)
	user, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	u.checkPremiumExpiry(ctx, &user)

	accessToken, refreshToken, expiresAt, err := u.generateTokens(user.ID)
	if err != nil {
		return nil, err
	}

	if err := u.userRepo.SaveRefreshToken(ctx, user.ID, refreshToken, expiresAt); err != nil {
		log.Printf("failed to save refresh token: %v", err)
	}

	return &domain.AuthResponse{
		User: domain.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Tier:      user.Tier,
			CreatedAt: user.CreatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *authUsecase) checkPremiumExpiry(ctx context.Context, user *domain.User) {
	if user.Tier == "premium" && user.PremiumExpiresAt != nil && user.PremiumExpiresAt.Before(time.Now()) {
		if err := u.userRepo.UpdateTier(ctx, user.ID, "free", nil); err != nil {
			log.Printf("failed to downgrade expired premium user %s: %v", user.ID, err)
		}
		user.Tier = "free"
	}
}

func (u *authUsecase) RefreshToken(ctx context.Context, refreshToken string) (*domain.AuthResponse, error) {
	claims, err := u.validateRefreshToken(refreshToken)
	if err != nil {
		return nil, domain.ErrTokenExpired
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return nil, domain.ErrTokenInvalid
	}

	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	u.checkPremiumExpiry(ctx, &user)

	newAccessToken, newRefreshToken, expiresAt, err := u.generateTokens(user.ID)
	if err != nil {
		return nil, err
	}

	if err := u.userRepo.ReplaceRefreshToken(ctx, refreshToken, newRefreshToken, user.ID, expiresAt); err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		User: domain.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Tier:      user.Tier,
			CreatedAt: user.CreatedAt,
		},
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
	}, nil
}

func (u *authUsecase) GetMe(ctx context.Context, userID string) (*domain.UserResponse, error) {
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	u.checkPremiumExpiry(ctx, &user)

	return &domain.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Tier:      user.Tier,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (u *authUsecase) UpdateMe(ctx context.Context, userID string, req *domain.UpdateUserRequest) (*domain.UserResponse, error) {
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = string(hashedPassword)
	}
	user.UpdatedAt = time.Now()

	if err := u.userRepo.Update(ctx, &user); err != nil {
		return nil, err
	}

	return &domain.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Tier:      user.Tier,
		CreatedAt: user.CreatedAt,
	}, nil
}

func (u *authUsecase) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	return u.userRepo.DeleteRefreshToken(ctx, refreshToken)
}

func (u *authUsecase) ValidateToken(tokenString string) (string, error) {
	claims, err := u.validateAccessToken(tokenString)
	if err != nil {
		return "", err
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", domain.ErrTokenInvalid
	}

	return userID, nil
}

func (u *authUsecase) generateTokens(userID string) (string, string, int64, error) {
	refreshExp := time.Now().Add(time.Duration(u.cfg.RefreshTokenExpiry) * 24 * time.Hour)

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Duration(u.cfg.JWTExpiration) * time.Minute).Unix(),
		"type":    "access",
	})

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     refreshExp.Unix(),
		"type":    "refresh",
		"jti":     uuid.New().String(),
	})

	refreshSecret := u.cfg.JWTRefreshSecret
	if refreshSecret == "" {
		refreshSecret = u.cfg.JWTSecret
	}

	accessTokenString, err := accessToken.SignedString([]byte(u.cfg.JWTSecret))
	if err != nil {
		return "", "", 0, err
	}

	refreshTokenString, err := refreshToken.SignedString([]byte(refreshSecret))
	if err != nil {
		return "", "", 0, err
	}

	return accessTokenString, refreshTokenString, refreshExp.Unix(), nil
}

func (u *authUsecase) validateAccessToken(tokenString string) (jwt.MapClaims, error) {
	return u.validateToken(tokenString, u.cfg.JWTSecret, "access")
}

func (u *authUsecase) validateRefreshToken(tokenString string) (jwt.MapClaims, error) {
	secret := u.cfg.JWTRefreshSecret
	if secret == "" {
		secret = u.cfg.JWTSecret
	}
	return u.validateToken(tokenString, secret, "refresh")
}

func (u *authUsecase) validateToken(tokenString string, secret string, expectedType string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrTokenInvalid
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return nil, domain.ErrTokenInvalid
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, domain.ErrTokenInvalid
	}

	if tokenType, ok := claims["type"].(string); !ok || tokenType != expectedType {
		return nil, domain.ErrTokenInvalid
	}

	return claims, nil
}
