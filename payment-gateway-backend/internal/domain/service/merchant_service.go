package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/crypto"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// Customer represents a customer with aggregated transaction data
type Customer struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	Phone            string  `json:"phone"`
	TotalSpent       float64 `json:"totalSpent"`
	TransactionCount int     `json:"transactionCount"`
	RefundedAmount   float64 `json:"refundedAmount"`
	SuccessCount     int     `json:"successCount"`
	RefundedCount    int     `json:"refundedCount"`
	LastPayment      string  `json:"lastPayment"`
	CreatedAt        string  `json:"createdAt"`
}

// BankAccount represents a merchant's bank account
type BankAccount struct {
	ID            string    `json:"id"`
	MerchantID    string    `json:"merchant_id"`
	BankName      string    `json:"bankName"`
	AccountNumber string    `json:"accountNumber"`
	AccountHolder string    `json:"accountHolder"`
	IFSC          string    `json:"ifsc"`
	AccountType   string    `json:"accountType"`
	IsDefault     bool      `json:"isDefault"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ApiKey represents an API key for merchants
type ApiKey struct {
	ID          string     `json:"id"`
	MerchantID  string     `json:"merchant_id"`
	Name        string     `json:"name"`
	Key         string     `json:"key"`
	Mode        string     `json:"mode"`
	CreatedAt   time.Time  `json:"createdAt"`
	LastUsed    *time.Time `json:"lastUsed"`
	UsageCount  int        `json:"usageCount"`
	Permissions []string   `json:"permissions"`
}

// Withdrawal represents a withdrawal request
type Withdrawal struct {
	ID            string  `json:"id"`
	MerchantID    string  `json:"merchantId"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	BankAccount   string  `json:"bankAccount"`
	CreatedAt     string  `json:"createdAt"`
	ProcessedAt   *string `json:"processedAt"`
	UTR           *string `json:"utr"`
	FailureReason *string `json:"failureReason"`
}

// MerchantBalance represents merchant's balance information
type MerchantBalance struct {
	AvailableBalance   float64 `json:"availableBalance"`
	PendingSettlements float64 `json:"pendingSettlements"`
	TotalRevenue       float64 `json:"totalRevenue"`
	LastSettlement     string  `json:"lastSettlement"`
}

// MerchantService handles merchant business logic
type MerchantService struct {
	merchantRepo    repository.MerchantRepository
	transactionRepo repository.TransactionRepository
	teamRepo        repository.TeamRepository
	logger          *logger.Logger
}

// NewMerchantService creates a new merchant service
func NewMerchantService(merchantRepo repository.MerchantRepository, transactionRepo repository.TransactionRepository, teamRepo repository.TeamRepository, logger *logger.Logger) *MerchantService {
	return &MerchantService{
		merchantRepo:    merchantRepo,
		transactionRepo: transactionRepo,
		teamRepo:        teamRepo,
		logger:          logger,
	}
}

// GetProfile retrieves merchant profile
func (s *MerchantService) GetProfile(ctx context.Context, merchantID uuid.UUID) (*models.Merchant, error) {
	return s.merchantRepo.GetByID(ctx, merchantID)
}

// UpdateProfile updates merchant profile
func (s *MerchantService) UpdateProfile(ctx context.Context, merchant *models.Merchant) error {
	return s.merchantRepo.Update(ctx, merchant)
}

// GetStats retrieves merchant statistics
func (s *MerchantService) GetStats(ctx context.Context, merchantID uuid.UUID) (map[string]interface{}, error) {
	// TODO: Implement actual stats calculation
	stats := map[string]interface{}{
		"total_transactions":  0,
		"total_revenue":       0,
		"success_rate":        0,
		"pending_settlements": 0,
	}
	return stats, nil
}

// GetCustomers retrieves all customers for a merchant with aggregated data
func (s *MerchantService) GetCustomers(ctx context.Context, merchantID uuid.UUID) ([]Customer, error) {
	// Get transactions with customer data
	transactions, err := s.transactionRepo.GetCustomersByMerchant(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	// Aggregate customers from transactions
	customerMap := make(map[string]*Customer)
	for _, tx := range transactions {
		if tx.CustomerEmail == "" {
			continue
		}

		email := tx.CustomerEmail
		if customer, exists := customerMap[email]; exists {
			// Update existing customer
			customer.TotalSpent += tx.Amount.InexactFloat64()
			customer.TransactionCount++

			// Track status counts
			if tx.Status == "success" {
				customer.SuccessCount++
			} else if tx.Status == "refunded" {
				customer.RefundedCount++
				customer.RefundedAmount += tx.Amount.InexactFloat64()
			}

			lastPaymentTime, err := time.Parse("2006-01-02 15:04:05", customer.LastPayment)
			if err == nil && tx.CreatedAt.After(lastPaymentTime) {
				customer.LastPayment = tx.CreatedAt.Format("2006-01-02 15:04:05")
			}
		} else {
			// Create new customer
			customer := &Customer{
				ID:               tx.ID.String(),
				Name:             email, // Use full email as name
				Email:            email,
				Phone:            tx.CustomerPhone,
				TotalSpent:       tx.Amount.InexactFloat64(),
				TransactionCount: 1,
				RefundedAmount:   0,
				SuccessCount:     0,
				RefundedCount:    0,
				LastPayment:      tx.CreatedAt.Format("2006-01-02 15:04:05"),
				CreatedAt:        tx.CreatedAt.Format("2006-01-02 15:04:05"),
			}

			// Set initial status counts
			if tx.Status == "success" {
				customer.SuccessCount = 1
			} else if tx.Status == "refunded" {
				customer.RefundedCount = 1
				customer.RefundedAmount = tx.Amount.InexactFloat64()
			}

			customerMap[email] = customer
		}
	}

	// Convert map to slice
	customers := make([]Customer, 0, len(customerMap))
	for _, customer := range customerMap {
		customers = append(customers, *customer)
	}

	return customers, nil
}

// GetBalance retrieves merchant balance information
func (s *MerchantService) GetBalance(ctx context.Context, merchantID uuid.UUID) (*MerchantBalance, error) {
	// Get transactions to calculate balance
	transactions, err := s.transactionRepo.GetCustomersByMerchant(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	var totalRevenue float64
	var pendingSettlements float64
	var refundedAmount float64

	for _, tx := range transactions {
		if tx.Status == "success" {
			totalRevenue += tx.Amount.InexactFloat64()
		} else if tx.Status == "pending" || tx.Status == "processing" {
			pendingSettlements += tx.Amount.InexactFloat64()
		} else if tx.Status == "refunded" {
			refundedAmount += tx.Amount.InexactFloat64()
		}
	}

	availableBalance := totalRevenue - pendingSettlements - refundedAmount

	return &MerchantBalance{
		AvailableBalance:   availableBalance,
		PendingSettlements: pendingSettlements,
		TotalRevenue:       totalRevenue,
		LastSettlement:     time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// GetBankAccounts retrieves merchant's bank accounts
func (s *MerchantService) GetBankAccounts(ctx context.Context, merchantID uuid.UUID) ([]BankAccount, error) {
	// Return empty array - no hardcoded accounts
	return []BankAccount{}, nil
}

// AddBankAccount adds a new bank account for the merchant
func (s *MerchantService) AddBankAccount(ctx context.Context, merchantID uuid.UUID, bankName, accountNumber, accountHolder, ifsc, accountType string) (*BankAccount, error) {
	now := time.Now()
	account := &BankAccount{
		ID:            uuid.New().String(),
		MerchantID:    merchantID.String(),
		BankName:      bankName,
		AccountNumber: "****" + accountNumber[len(accountNumber)-4:],
		AccountHolder: accountHolder,
		IFSC:          ifsc,
		AccountType:   accountType,
		IsDefault:     false,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// In real implementation, save to database
	return account, nil
}

// ...
// RequestWithdrawal creates a new withdrawal request
func (s *MerchantService) RequestWithdrawal(ctx context.Context, merchantID uuid.UUID, amount float64, bankAccountID string) (*Withdrawal, error) {
	// Check balance
	balance, err := s.GetBalance(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	if amount > balance.AvailableBalance {
		return nil, fmt.Errorf("insufficient balance")
	}

	// Get bank account to verify it exists
	accounts, err := s.GetBankAccounts(ctx, merchantID)
	if err != nil {
		return nil, err
	}

	// Find the bank account
	var bankAccount *BankAccount
	for _, acc := range accounts {
		if acc.ID == bankAccountID {
			bankAccount = &acc
			break
		}
	}

	if bankAccount == nil {
		return nil, fmt.Errorf("bank account not found")
	}

	withdrawal := &Withdrawal{
		ID:          uuid.New().String(),
		MerchantID:  merchantID.String(),
		Amount:      amount,
		Status:      "pending",
		BankAccount: bankAccount.BankName + " " + bankAccount.AccountNumber,
		CreatedAt:   time.Now().Format("2006-01-02 15:04:05"),
	}
	return withdrawal, nil
}

// GetWithdrawals retrieves merchant's withdrawal history
func (s *MerchantService) GetWithdrawals(ctx context.Context, merchantID uuid.UUID) ([]Withdrawal, error) {
	// Return empty array - no hardcoded withdrawals
	return []Withdrawal{}, nil
}

// API Key management methods
func (s *MerchantService) CreateApiKey(ctx context.Context, merchantID uuid.UUID, environment string) (*repository.APIKey, string, error) {
	s.logger.Info("Creating API key", "merchant_id", merchantID, "env", environment)
	
	// Generate raw keys
	pk := fmt.Sprintf("ap_%s_pub_%s", environment, crypto.GenerateRandomString(32))
	skRaw := fmt.Sprintf("ap_%s_sec_%s", environment, crypto.GenerateRandomString(32))
	
	// Hash secret key
	skHash, err := crypto.HashPassword(skRaw)
	if err != nil {
		return nil, "", err
	}

	key := &repository.APIKey{
		MerchantID:     merchantID.String(),
		Environment:    environment,
		PublishableKey: pk,
		SecretKeyID:    skRaw[0:16],
		SecretKeyHash:  skHash,
	}

	if err := s.merchantRepo.CreateAPIKey(ctx, key); err != nil {
		return nil, "", err
	}

	return key, skRaw, nil
}

func (s *MerchantService) GetApiKeys(ctx context.Context, merchantID uuid.UUID) ([]repository.APIKey, error) {
	s.logger.Info("Getting API keys", "merchant_id", merchantID.String())
	return s.merchantRepo.GetAPIKeys(ctx, merchantID)
}

func (s *MerchantService) UpdateApiKey(ctx context.Context, keyID string, key *ApiKey) error {
	s.logger.Info("Updating API key", "key_id", keyID)
	// TODO: Implement actual API key update in database
	return nil
}

func (s *MerchantService) DeleteApiKey(ctx context.Context, keyID string) error {
	s.logger.Info("Deleting API key", "key_id", keyID)
	// TODO: Implement actual API key deletion in database
	return nil
}

func (s *MerchantService) GetTeamMembers(ctx context.Context, merchantID uuid.UUID) ([]*models.TeamMember, error) {
	return s.teamRepo.GetByMerchantID(ctx, merchantID)
}

func (s *MerchantService) InviteTeamMember(ctx context.Context, merchantID uuid.UUID, name, email, role string) (*models.TeamMember, error) {
	member := &models.TeamMember{
		ID:         uuid.New(),
		MerchantID: merchantID,
		Name:       name,
		Email:      email,
		Role:       role,
		Status:     "active",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	err := s.teamRepo.Create(ctx, member)
	if err != nil {
		return nil, err
	}
	return member, nil
}

func (s *MerchantService) RemoveTeamMember(ctx context.Context, id uuid.UUID, merchantID uuid.UUID) error {
	return s.teamRepo.Delete(ctx, id, merchantID)
}

func (s *MerchantService) UpdatePassword(ctx context.Context, merchantID uuid.UUID, oldPassword, newPassword string) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return err
	}

	// verify old password
	if merchant.PasswordHash != "" {
		if !crypto.VerifyPassword(oldPassword, merchant.PasswordHash) {
			return fmt.Errorf("incorrect current password")
		}
	}

	newHash, err := crypto.HashPassword(newPassword)
	if err != nil {
		return err
	}

	merchant.PasswordHash = newHash
	merchant.UpdatedAt = time.Now()

	return s.merchantRepo.Update(ctx, merchant)
}

func stringPtr(s string) *string {
	return &s
}
