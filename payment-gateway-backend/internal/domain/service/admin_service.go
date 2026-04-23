package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
	"github.com/yourcompany/payment-gateway/internal/domain/repository"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type AdminService struct {
	adminRepo repository.AdminRepository
	auth      *AuthService
	logger    *logger.Logger
}

func NewAdminService(adminRepo repository.AdminRepository, auth *AuthService, logger *logger.Logger) *AdminService {
	return &AdminService{
		adminRepo: adminRepo,
		auth:      auth,
		logger:    logger,
	}
}

func (s *AdminService) GetSystemMetrics(ctx context.Context) (*repository.AdminSystemMetrics, error) {
	return s.adminRepo.GetSystemMetrics(ctx)
}

func (s *AdminService) GetAllMerchants(ctx context.Context) ([]repository.AdminMerchant, error) {
	return s.adminRepo.GetAllMerchants(ctx)
}

func (s *AdminService) GetMerchantDetail(ctx context.Context, merchantID string) (*repository.AdminMerchantDetail, error) {
	return s.adminRepo.GetMerchantDetail(ctx, merchantID)
}

func (s *AdminService) UpdateMerchantStatus(ctx context.Context, merchantID string, status string) error {
	s.logger.Info("Admin updating merchant status", "merchant_id", merchantID, "new_status", status)
	if err := s.adminRepo.UpdateMerchantStatus(ctx, merchantID, status); err != nil {
		return err
	}
	if status == "suspended" && s.auth != nil {
		if id, err := uuid.Parse(merchantID); err == nil {
			if invErr := s.auth.InvalidateSessions(ctx, id); invErr != nil {
				s.logger.Error("invalidate sessions after suspend", "merchant_id", merchantID, "error", invErr)
			}
		}
	}
	return nil
}

func (s *AdminService) GetAllDisputes(ctx context.Context) ([]repository.AdminDispute, error) {
	return s.adminRepo.GetAllDisputes(ctx)
}

func (s *AdminService) GetRecentActivity(ctx context.Context) ([]repository.AdminActivity, error) {
	return s.adminRepo.GetRecentActivity(ctx)
}

func (s *AdminService) GetAllTransactions(ctx context.Context) ([]repository.AdminTransaction, error) {
	return s.adminRepo.GetAllTransactions(ctx)
}

func (s *AdminService) GetRiskTransactions(ctx context.Context) ([]repository.AdminTransaction, error) {
	return s.adminRepo.GetRiskTransactions(ctx)
}

func (s *AdminService) RefundTransaction(ctx context.Context, id string) error {
	s.logger.Info("Admin force refunded transaction", "transaction_id", id)
	return s.adminRepo.RefundTransaction(ctx, id)
}

func (s *AdminService) GetSettings(ctx context.Context) (*repository.AdminSettings, error) {
	return s.adminRepo.GetSettings(ctx)
}

func (s *AdminService) UpdateSettings(ctx context.Context, settings *repository.AdminSettings) error {
	s.logger.Info("Admin updated platform settings")
	return s.adminRepo.UpdateSettings(ctx, settings)
}

func (s *AdminService) GetWebhookStats(ctx context.Context) (*repository.AdminWebhookStats, error) {
	return s.adminRepo.GetWebhookStats(ctx)
}

func (s *AdminService) ResolveDispute(ctx context.Context, disputeID string, status string) error {
	s.logger.Info("Admin resolving dispute", "dispute_id", disputeID, "resolution", status)
	return s.adminRepo.ResolveDispute(ctx, disputeID, status)
}

func (s *AdminService) GetAllSettlements(ctx context.Context) ([]models.Settlement, error) {
	return s.adminRepo.GetAllSettlements(ctx)
}

func (s *AdminService) ApproveSettlement(ctx context.Context, id string) error {
	s.logger.Info("Admin approving settlement batch", "settlement_id", id)
	return s.adminRepo.ApproveSettlement(ctx, id)
}

func (s *AdminService) GetRoutingStats(ctx context.Context) (map[string]interface{}, error) {
	// Return the "India First" simulated routing distribution
	return map[string]interface{}{
		"distribution": []map[string]interface{}{
			{"provider": "npc_native", "percentage": 82, "status": "active"},
			{"provider": "card_pay",   "percentage": 12, "status": "active"},
			{"provider": "razor_fb",    "percentage": 4,  "status": "degraded"},
			{"provider": "stripe_fb",   "percentage": 2,  "status": "active"},
		},
		"optimization_score": 98.4,
		"last_updated":       "just now",
	}, nil
}
