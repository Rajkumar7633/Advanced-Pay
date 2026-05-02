package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type AdminSystemMetrics struct {
	TotalVolume      decimal.Decimal `json:"total_volume"`
	ActiveMerchants  int64           `json:"active_merchants"`
	PendingItems     int64           `json:"pending_items"`
	SystemUptime     float64         `json:"system_uptime"`
	TransactionsData []HourlyMetric  `json:"transactions_data"`
}

type HourlyMetric struct {
	Time         string  `json:"time" db:"time"`
	Transactions int64   `json:"transactions" db:"transactions"`
	SuccessRate  float64 `json:"success" db:"success"`
}

type AdminMerchant struct {
	ID           string          `json:"id" db:"id"`
	Name         string          `json:"name" db:"name"`
	Email        string          `json:"email" db:"email"`
	Phone        string          `json:"phone" db:"phone"`
	Industry     string          `json:"industry" db:"industry"`
	City         string          `json:"city" db:"city"`
	Country      string          `json:"country" db:"country"`
	Volume       decimal.Decimal `json:"volume" db:"volume"`
	Status       string          `json:"status" db:"status"`
	CreationDate string          `json:"date" db:"date"`
}

// AdminMerchantDetail is the full merchant record plus aggregates for admin review.
type AdminMerchantDetail struct {
	ID                  string `json:"id" db:"id"`
	BusinessName        string `json:"business_name" db:"business_name"`
	Email               string `json:"email" db:"email"`
	Phone               string `json:"phone" db:"phone"`
	Status              string `json:"status" db:"status"`
	KYCStatus           string `json:"kyc_status" db:"kyc_status"`
	KYCDocuments        string `json:"kyc_documents" db:"kyc_documents"`
	CreatedAt           string `json:"created_at" db:"created_at"`
	Description         string `json:"description" db:"description"`
	Website             string `json:"website" db:"website"`
	Industry            string `json:"industry" db:"industry"`
	GSTNumber           string `json:"gst_number" db:"gst_number"`
	TaxID               string `json:"tax_id" db:"tax_id"`
	AddressStreet       string `json:"address_street" db:"address_street"`
	AddressCity         string `json:"address_city" db:"address_city"`
	AddressState        string `json:"address_state" db:"address_state"`
	AddressCountry      string `json:"address_country" db:"address_country"`
	AddressPostalCode   string `json:"address_postal_code" db:"address_postal_code"`
	TwoFactorEnabled    bool   `json:"two_factor_enabled" db:"two_factor_enabled"`
	TotalTransactions   int64  `json:"total_transactions" db:"total_transactions"`
	SuccessfulVolume    string `json:"successful_volume" db:"successful_volume"`
	OpenDisputes        int64  `json:"open_disputes" db:"open_disputes"`
	ActiveSubscriptions int64  `json:"active_subscriptions" db:"active_subscriptions"`
}

type AdminDispute struct {
	ID          string          `json:"id" db:"id"`
	Merchant    string          `json:"merchant" db:"merchant"`
	MerchantID  string          `json:"merchant_id" db:"merchant_id"`
	Amount      decimal.Decimal `json:"amount" db:"amount"`
	Reason      string          `json:"reason" db:"reason"`
	Status      string          `json:"status" db:"status"`
	Description *string         `json:"description" db:"description"`
	CreatedAt   string          `json:"created_at" db:"created_at"`
}

type AdminActivity struct {
	Type    string `json:"type" db:"type"`
	Message string `json:"message" db:"message"`
	Time    string `json:"time" db:"time"`
}

type AdminTransaction struct {
	ID         string `json:"id" db:"id"`
	Merchant   string `json:"merchant" db:"merchant"`
	Amount     string `json:"amount" db:"amount"`
	Currency   string `json:"currency" db:"currency"`
	Status     string `json:"status" db:"status"`
	Method     string `json:"method" db:"method"`
	CreatedAt  string `json:"created_at" db:"created_at"`
}

type AdminSettings struct {
	CardFee               decimal.Decimal `json:"card_fee" db:"card_fee"`
	UPIFee                decimal.Decimal `json:"upi_fee" db:"upi_fee"`
	NetbankingFee         decimal.Decimal `json:"netbanking_fee" db:"netbanking_fee"`
	AutoApproveMerchants  bool            `json:"auto_approve_merchants" db:"auto_approve_merchants"`
	FraudBlocking         bool            `json:"fraud_blocking" db:"fraud_blocking"`
	InternationalPayments bool            `json:"international_payments" db:"international_payments"`
	MaintenanceMode       bool            `json:"maintenance_mode" db:"maintenance_mode"`
}

type AdminWebhookStats struct {
	TotalEvents  int `json:"total_events" db:"total"`
	Pending      int `json:"pending" db:"pending"`
	Completed    int `json:"completed" db:"completed"`
	Failed       int `json:"failed" db:"failed"`
}

type AdminRepository interface {
	GetSystemMetrics(ctx context.Context) (*AdminSystemMetrics, error)
	GetAllMerchants(ctx context.Context) ([]AdminMerchant, error)
	GetMerchantDetail(ctx context.Context, merchantID string) (*AdminMerchantDetail, error)
	UpdateMerchantStatus(ctx context.Context, merchantID string, status string) error
	GetAllDisputes(ctx context.Context) ([]AdminDispute, error)
	ResolveDispute(ctx context.Context, disputeID string, status string) error
	GetAllTransactions(ctx context.Context) ([]AdminTransaction, error)
	GetRiskTransactions(ctx context.Context) ([]AdminTransaction, error)
	RefundTransaction(ctx context.Context, id string) error
	GetRecentActivity(ctx context.Context) ([]AdminActivity, error)
	GetSettings(ctx context.Context) (*AdminSettings, error)
	UpdateSettings(ctx context.Context, settings *AdminSettings) error
	GetWebhookStats(ctx context.Context) (*AdminWebhookStats, error)
	GetAllSettlements(ctx context.Context) ([]models.Settlement, error)
	ApproveSettlement(ctx context.Context, id string) error
}

type adminRepository struct {
	db *sqlx.DB
}

func NewAdminRepository(db *sqlx.DB) AdminRepository {
	return &adminRepository{db: db}
}

func (r *adminRepository) GetSystemMetrics(ctx context.Context) (*AdminSystemMetrics, error) {
	metrics := &AdminSystemMetrics{}

	// Total Volume (All Time — includes captured, completed, success statuses)
	_ = r.db.GetContext(ctx, &metrics.TotalVolume, `
		SELECT COALESCE(SUM(amount), 0) FROM transactions 
		WHERE status IN ('success', 'captured', 'completed')
	`)

	// Active Merchants
	_ = r.db.GetContext(ctx, &metrics.ActiveMerchants, `
		SELECT COUNT(*) FROM merchants WHERE status = 'active' OR status = 'approved'
	`)

	// Pending Items (Pending Merchants + Open Disputes)
	var pendingMerchants int64
	_ = r.db.GetContext(ctx, &pendingMerchants, `SELECT COUNT(*) FROM merchants WHERE status = 'pending'`)
	var openDisputes int64
	_ = r.db.GetContext(ctx, &openDisputes, `SELECT COUNT(*) FROM disputes WHERE status = 'open' OR status = 'under_review'`)

	metrics.PendingItems = pendingMerchants + openDisputes
	metrics.SystemUptime = 99.99

	// Dynamic Hourly Transactions (Last 24 Hours)
	var hourlyMetrics []HourlyMetric
	err := r.db.SelectContext(ctx, &hourlyMetrics, `
		SELECT 
			TO_CHAR(DATE_TRUNC('hour', created_at), 'HH24:00') as time,
			COUNT(*) as transactions,
			ROUND((SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as success
		FROM transactions
		WHERE created_at >= NOW() - INTERVAL '24 hours'
		GROUP BY DATE_TRUNC('hour', created_at)
		ORDER BY DATE_TRUNC('hour', created_at)
	`)

	if err != nil || len(hourlyMetrics) == 0 {
		metrics.TransactionsData = []HourlyMetric{}
	} else {
		metrics.TransactionsData = hourlyMetrics
	}

	return metrics, nil
}

func (r *adminRepository) GetAllMerchants(ctx context.Context) ([]AdminMerchant, error) {
	var merchants []AdminMerchant
	err := r.db.SelectContext(ctx, &merchants, `
		SELECT 
			m.id::text as id, 
			m.business_name as name, 
			m.email,
			COALESCE(m.phone, '') as phone,
			COALESCE(m.industry, 'General') as industry,
			COALESCE(m.address_city, '') as city,
			COALESCE(m.address_country, '') as country,
			COALESCE(SUM(t.amount), 0) as volume, 
			m.status, 
			TO_CHAR(m.created_at, 'YYYY-MM-DD') as date
		FROM merchants m
		LEFT JOIN transactions t ON t.merchant_id = m.id AND t.status = 'success'
		GROUP BY m.id
		ORDER BY m.created_at DESC
	`)
	return merchants, err
}

func (r *adminRepository) GetMerchantDetail(ctx context.Context, merchantID string) (*AdminMerchantDetail, error) {
	var d AdminMerchantDetail
	err := r.db.GetContext(ctx, &d, `
		SELECT
			m.id::text AS id,
			m.business_name,
			m.email,
			COALESCE(m.phone, '') AS phone,
			m.status,
			COALESCE(m.kyc_status, '') AS kyc_status,
			COALESCE(m.kyc_documents::text, '{}') AS kyc_documents,
			TO_CHAR(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
			COALESCE(m.description, '') AS description,
			COALESCE(m.website, '') AS website,
			COALESCE(m.industry, '') AS industry,
			COALESCE(m.gst_number, '') AS gst_number,
			COALESCE(m.tax_id, '') AS tax_id,
			COALESCE(m.address_street, '') AS address_street,
			COALESCE(m.address_city, '') AS address_city,
			COALESCE(m.address_state, '') AS address_state,
			COALESCE(m.address_country, '') AS address_country,
			COALESCE(m.address_postal_code, '') AS address_postal_code,
			m.two_factor_enabled,
			(SELECT COUNT(*) FROM transactions WHERE merchant_id = m.id) AS total_transactions,
			(SELECT COALESCE(SUM(amount), 0)::text FROM transactions WHERE merchant_id = m.id AND status = 'success') AS successful_volume,
			(SELECT COUNT(*) FROM disputes d WHERE d.merchant_id = m.id AND d.status IN ('open', 'under_review')) AS open_disputes,
			(SELECT COUNT(*) FROM subscriptions s WHERE s.merchant_id = m.id AND s.status = 'active') AS active_subscriptions
		FROM merchants m
		WHERE m.id = $1
	`, merchantID)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *adminRepository) UpdateMerchantStatus(ctx context.Context, merchantID string, status string) error {
	if status == "approved" {
		_, err := r.db.ExecContext(ctx, `UPDATE merchants SET status = $1, kyc_status = 'verified' WHERE id = $2`, status, merchantID)
		return err
	}
	_, err := r.db.ExecContext(ctx, `UPDATE merchants SET status = $1 WHERE id = $2`, status, merchantID)
	return err
}

func (r *adminRepository) GetAllDisputes(ctx context.Context) ([]AdminDispute, error) {
	var disputes []AdminDispute
	err := r.db.SelectContext(ctx, &disputes, `
		SELECT 
			d.id::text as id, 
			m.business_name as merchant,
			m.id::text as merchant_id,
			d.amount, 
			d.reason, 
			d.status,
			d.description,
			TO_CHAR(d.created_at, 'YYYY-MM-DD HH24:MI') as created_at
		FROM disputes d
		JOIN merchants m ON d.merchant_id = m.id
		ORDER BY d.created_at DESC
	`)
	if err != nil {
		return []AdminDispute{}, err
	}
	return disputes, nil
}

func (r *adminRepository) ResolveDispute(ctx context.Context, disputeID string, status string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE disputes SET status = $1, resolved_at = NOW(), updated_at = NOW() WHERE id = $2
	`, status, disputeID)
	return err
}

func (r *adminRepository) GetRecentActivity(ctx context.Context) ([]AdminActivity, error) {
	var activity []AdminActivity
	err := r.db.SelectContext(ctx, &activity, `
		SELECT type, message, time FROM (
			(SELECT 'info' as type, 'New merchant registered: ' || business_name as message, TO_CHAR(created_at, 'HH24:MI') as time, created_at FROM merchants ORDER BY created_at DESC LIMIT 5)
			UNION ALL
			(SELECT 'success' as type, 'High value transaction: ' || currency || ' ' || amount as message, TO_CHAR(created_at, 'HH24:MI') as time, created_at FROM transactions WHERE amount > 1000 ORDER BY created_at DESC LIMIT 5)
			UNION ALL
			(SELECT 'critical' as type, 'New dispute opened: ' || reason as message, TO_CHAR(created_at, 'HH24:MI') as time, created_at FROM disputes ORDER BY created_at DESC LIMIT 5)
		) q
		ORDER BY created_at DESC
		LIMIT 10
	`)
	if err != nil {
		return []AdminActivity{}, err
	}
	return activity, nil
}

func (r *adminRepository) GetAllTransactions(ctx context.Context) ([]AdminTransaction, error) {
	var txns []AdminTransaction
	err := r.db.SelectContext(ctx, &txns, `
		SELECT
			t.id::text as id,
			COALESCE(m.business_name, 'Unknown') as merchant,
			t.amount::text as amount,
			COALESCE(t.currency, 'INR') as currency,
			t.status,
			COALESCE(t.payment_method, 'card') as method,
			TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI') as created_at
		FROM transactions t
		LEFT JOIN merchants m ON t.merchant_id = m.id
		ORDER BY t.created_at DESC
		LIMIT 200
	`)
	if err != nil {
		return []AdminTransaction{}, err
	}
	return txns, nil
}

func (r *adminRepository) GetRiskTransactions(ctx context.Context) ([]AdminTransaction, error) {
	var txns []AdminTransaction
	err := r.db.SelectContext(ctx, &txns, `
		SELECT
			t.id::text as id,
			COALESCE(m.business_name, 'Unknown') as merchant,
			t.amount::text as amount,
			COALESCE(t.currency, 'INR') as currency,
			t.status,
			COALESCE(t.payment_method, 'card') as method,
			TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI') as created_at
		FROM transactions t
		LEFT JOIN merchants m ON t.merchant_id = m.id
		WHERE t.fraud_score > 60
		ORDER BY t.fraud_score DESC, t.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		return []AdminTransaction{}, err
	}
	return txns, nil
}

func (r *adminRepository) RefundTransaction(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE transactions SET status = 'refunded' WHERE id = $1 AND status != 'refunded'", id)
	return err
}

func (r *adminRepository) GetSettings(ctx context.Context) (*AdminSettings, error) {
	var settings AdminSettings
	err := r.db.GetContext(ctx, &settings, `SELECT card_fee, upi_fee, netbanking_fee, auto_approve_merchants, fraud_blocking, international_payments, maintenance_mode FROM platform_settings WHERE id = 1`)
	if err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *adminRepository) UpdateSettings(ctx context.Context, settings *AdminSettings) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE platform_settings SET 
			card_fee = $1, upi_fee = $2, netbanking_fee = $3, 
			auto_approve_merchants = $4, fraud_blocking = $5, 
			international_payments = $6, maintenance_mode = $7,
			updated_at = NOW()
		WHERE id = 1
	`, settings.CardFee, settings.UPIFee, settings.NetbankingFee, settings.AutoApproveMerchants, settings.FraudBlocking, settings.InternationalPayments, settings.MaintenanceMode)
	return err
}

func (r *adminRepository) GetWebhookStats(ctx context.Context) (*AdminWebhookStats, error) {
	var stats AdminWebhookStats
	err := r.db.GetContext(ctx, &stats, `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'pending') as pending,
			COUNT(*) FILTER (WHERE status = 'completed') as completed,
			COUNT(*) FILTER (WHERE status = 'failed' OR status = 'skipped') as failed
		FROM webhook_events
	`)
	if err != nil {
		return &AdminWebhookStats{}, err
	}
	return &stats, nil
}

func (r *adminRepository) GetAllSettlements(ctx context.Context) ([]models.Settlement, error) {
	var settlements []models.Settlement
	err := r.db.SelectContext(ctx, &settlements, `
		SELECT id, merchant_id, settlement_date, total_amount, total_transactions,
		       fees, tax, net_amount, status, utr_number, settled_at, created_at, updated_at
		FROM settlements
		ORDER BY created_at DESC`)
	if err != nil {
		return []models.Settlement{}, err
	}
	return settlements, nil
}

func (r *adminRepository) ApproveSettlement(ctx context.Context, id string) error {
	utr := fmt.Sprintf("UTR%d", time.Now().Unix())
	_, err := r.db.ExecContext(ctx, `
		UPDATE settlements 
		SET status = 'settled', utr_number = $1, settled_at = NOW(), updated_at = NOW() 
		WHERE id = $2`, utr, id)
	return err
}
