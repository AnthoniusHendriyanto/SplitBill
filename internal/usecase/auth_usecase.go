package usecase

import (
	"context"
	"errors"
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

func NewAuthUsecase(userRepo domain.UserRepository, cfg *config.Config) domain.AuthUsecase {
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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
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

	accessToken, refreshToken, err := u.generateTokens(user.ID)
	if err != nil {
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
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *authUsecase) Login(ctx context.Context, req *domain.LoginRequest) (*domain.AuthResponse, error) {
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

	accessToken, refreshToken, err := u.generateTokens(user.ID)
	if err != nil {
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
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *authUsecase) RefreshToken(ctx context.Context, refreshToken string) (*domain.AuthResponse, error) {
	claims, err := u.validateToken(refreshToken)
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

	newAccessToken, newRefreshToken, err := u.generateTokens(user.ID)
	if err != nil {
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

func (u *authUsecase) ValidateToken(tokenString string) (string, error) {
	claims, err := u.validateToken(tokenString)
	if err != nil {
		return "", err
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", domain.ErrTokenInvalid
	}

	return userID, nil
}

func (u *authUsecase) generateTokens(userID string) (string, string, error) {
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Duration(u.cfg.JWTExpiration) * time.Minute).Unix(),
		"type":    "access",
	})

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Duration(u.cfg.RefreshTokenExpiry) * 24 * time.Hour).Unix(),
		"type":    "refresh",
		"jti":     uuid.New().String(),
	})

	accessTokenString, err := accessToken.SignedString([]byte(u.cfg.JWTSecret))
	if err != nil {
		return "", "", err
	}

	refreshTokenString, err := refreshToken.SignedString([]byte(u.cfg.JWTSecret))
	if err != nil {
		return "", "", err
	}

	return accessTokenString, refreshTokenString, nil
}

func (u *authUsecase) validateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrTokenInvalid
		}
		return []byte(u.cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, domain.ErrTokenInvalid
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, domain.ErrTokenInvalid
	}

	return claims, nil
}