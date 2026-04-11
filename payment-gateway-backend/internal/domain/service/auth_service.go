package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/cache"
	"github.com/yourcompany/payment-gateway/pkg/crypto"
	"github.com/yourcompany/payment-gateway/pkg/logger"
	"github.com/pquerna/otp/totp"
)

// AuthService handles authentication logic
type AuthService struct {
	merchantRepo repository.MerchantRepository
	cache        cache.Client
	jwtConfig    config.JWTConfig
	logger       *logger.Logger
}

// Claims represents JWT claims
type Claims struct {
	MerchantID   string `json:"merchant_id"`
	Email        string `json:"email"`
	TokenVersion int    `json:"token_version"`
	jwt.RegisteredClaims
}

// NewAuthService creates a new auth service
func NewAuthService(
	merchantRepo repository.MerchantRepository,
	cacheClient cache.Client,
	jwtConfig config.JWTConfig,
	logger *logger.Logger,
) *AuthService {
	return &AuthService{
		merchantRepo: merchantRepo,
		cache:        cacheClient,
		jwtConfig:    jwtConfig,
		logger:       logger,
	}
}

// Register creates a new merchant account
func (s *AuthService) Register(ctx context.Context, req *models.RegisterRequest) (*models.Merchant, error) {
	// Check if email already exists
	existing, err := s.merchantRepo.GetByEmail(ctx, req.Email)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Generate API keys
	apiKey := crypto.GenerateAPIKey()
	apiSecret := crypto.GenerateAPISecret()
	apiKeyHash, _ := crypto.HashAPIKey(apiKey)
	apiSecretHash, _ := crypto.HashAPIKey(apiSecret)

	// Create merchant
	merchant := &models.Merchant{
		ID:            uuid.New(),
		BusinessName:  req.BusinessName,
		Email:         req.Email,
		Phone:         req.Phone,
		PasswordHash:  passwordHash,
		APIKeyHash:    apiKeyHash,
		APISecretHash: apiSecretHash,
		Status:        "active",
		KYCStatus:     "pending",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.merchantRepo.Create(ctx, merchant); err != nil {
		return nil, fmt.Errorf("failed to create merchant: %w", err)
	}

	// Backwards-compat: also store password hash in cache if available (helps short-lived envs)
	if s.cache != nil {
		_ = s.cache.Set(ctx, fmt.Sprintf("password:%s", merchant.ID.String()), passwordHash, 0)
	}

	// Store API keys temporarily (in production, show only once)
	_ = s.cache.Set(ctx, fmt.Sprintf("apikey:%s", merchant.ID.String()), apiKey, 24*time.Hour)
	_ = s.cache.Set(ctx, fmt.Sprintf("apisecret:%s", merchant.ID.String()), apiSecret, 24*time.Hour)

	s.logger.Info("Merchant registered", "merchant_id", merchant.ID, "email", req.Email)

	return merchant, nil
}

// Login authenticates a merchant and returns JWT tokens
func (s *AuthService) Login(ctx context.Context, req *models.LoginRequest) (*models.LoginResponse, error) {
	// Get merchant by email
	merchant, err := s.merchantRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Check merchant status
	if merchant.Status != "active" {
		return nil, fmt.Errorf("account is %s", merchant.Status)
	}

	// Verify password (prefer DB-persisted hash)
	storedHash := merchant.PasswordHash
	if storedHash == "" && s.cache != nil {
		// Backwards-compat for merchants created before password_hash column
		cachedHash, err := s.cache.Get(ctx, fmt.Sprintf("password:%s", merchant.ID.String()))
		if err == nil {
			storedHash = cachedHash
		}
	}
	if storedHash == "" || !crypto.VerifyPassword(req.Password, storedHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	if merchant.TwoFactorEnabled {
		return &models.LoginResponse{
			Requires2FA: true,
			MerchantID:  merchant.ID.String(),
		}, nil
	}

	// Make sure active version is synced into redis
	_ = s.cache.Set(ctx, fmt.Sprintf("token_version:%s", merchant.ID.String()), merchant.TokenVersion, 0)

	// Generate tokens
	accessToken, err := s.generateAccessToken(merchant)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(merchant)
	if err != nil {
		return nil, err
	}

	// Store refresh token
	_ = s.cache.Set(ctx, fmt.Sprintf("refresh:%s", merchant.ID.String()), refreshToken, s.jwtConfig.RefreshTokenTTL)

	s.logger.Info("Merchant logged in", "merchant_id", merchant.ID, "email", req.Email)

	return &models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtConfig.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
	}, nil
}

// RefreshToken generates new access token from refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*models.LoginResponse, error) {
	// Parse refresh token
	claims, err := s.parseToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token")
	}

	// Verify refresh token exists in Redis
	merchantID := claims.MerchantID
	storedToken, err := s.cache.Get(ctx, fmt.Sprintf("refresh:%s", merchantID))
	if err != nil || storedToken != refreshToken {
		return nil, fmt.Errorf("invalid refresh token")
	}

	// Get merchant
	merchantUUID, _ := uuid.Parse(merchantID)
	merchant, err := s.merchantRepo.GetByID(ctx, merchantUUID)
	if err != nil {
		return nil, err
	}

	// Generate new access token
	accessToken, err := s.generateAccessToken(merchant)
	if err != nil {
		return nil, err
	}

	return &models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtConfig.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
	}, nil
}

// ValidateToken validates JWT token and returns merchant ID
func (s *AuthService) ValidateToken(tokenString string) (uuid.UUID, error) {
	claims, err := s.parseToken(tokenString)
	if err != nil {
		return uuid.Nil, err
	}

	merchantID, err := uuid.Parse(claims.MerchantID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid merchant ID in token")
	}

	return merchantID, nil
}

func (s *AuthService) generateAccessToken(merchant *models.Merchant) (string, error) {
	claims := &Claims{
		MerchantID:   merchant.ID.String(),
		Email:        merchant.Email,
		TokenVersion: merchant.TokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtConfig.AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   merchant.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtConfig.Secret))
}

func (s *AuthService) generateRefreshToken(merchant *models.Merchant) (string, error) {
	claims := &Claims{
		MerchantID:   merchant.ID.String(),
		Email:        merchant.Email,
		TokenVersion: merchant.TokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.jwtConfig.RefreshTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   merchant.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtConfig.Secret))
}

func (s *AuthService) parseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtConfig.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// InvalidateSessions revokes all JWT tokens globally for a merchant by incrementing their version block.
func (s *AuthService) InvalidateSessions(ctx context.Context, merchantID uuid.UUID) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return err
	}
	merchant.TokenVersion++
	
	// immediately invalidate in redis
	_ = s.cache.Set(ctx, fmt.Sprintf("token_version:%s", merchant.ID.String()), merchant.TokenVersion, 0)
	
	return s.merchantRepo.Update(ctx, merchant)
}

func (s *AuthService) Generate2FASecret(ctx context.Context, merchantID uuid.UUID) (string, error) {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil { return "", err }

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "PaymentGateway",
		AccountName: merchant.Email,
	})
	if err != nil { return "", err }

	secretStr := key.Secret()
	merchant.TwoFactorSecret = &secretStr
	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return "", err
	}

	return key.URL(), nil
}

func (s *AuthService) VerifyAndEnable2FA(ctx context.Context, merchantID uuid.UUID, code string) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil { return err }

	if merchant.TwoFactorSecret == nil {
		return fmt.Errorf("2FA not initialized")
	}

	valid := totp.Validate(code, *merchant.TwoFactorSecret)
	if !valid {
		return fmt.Errorf("invalid 2FA code")
	}

	merchant.TwoFactorEnabled = true
	return s.merchantRepo.Update(ctx, merchant)
}

func (s *AuthService) Disable2FA(ctx context.Context, merchantID uuid.UUID) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil { return err }

	merchant.TwoFactorEnabled = false
	merchant.TwoFactorSecret = nil
	return s.merchantRepo.Update(ctx, merchant)
}

func (s *AuthService) LoginVerify2FA(ctx context.Context, req *models.Verify2FARequest) (*models.LoginResponse, error) {
	merchantID, err := uuid.Parse(req.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("invalid merchant format")
	}

	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil || merchant.TwoFactorSecret == nil || !merchant.TwoFactorEnabled {
		return nil, fmt.Errorf("invalid request")
	}

	valid := totp.Validate(req.Code, *merchant.TwoFactorSecret)
	if !valid {
		return nil, fmt.Errorf("invalid 2FA code")
	}

	_ = s.cache.Set(ctx, fmt.Sprintf("token_version:%s", merchant.ID.String()), merchant.TokenVersion, 0)

	accessToken, err := s.generateAccessToken(merchant)
	if err != nil { return nil, err }
	refreshToken, err := s.generateRefreshToken(merchant)
	if err != nil { return nil, err }

	_ = s.cache.Set(ctx, fmt.Sprintf("refresh:%s", merchant.ID.String()), refreshToken, s.jwtConfig.RefreshTokenTTL)

	return &models.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwtConfig.AccessTokenTTL.Seconds()),
		TokenType:    "Bearer",
	}, nil
}
