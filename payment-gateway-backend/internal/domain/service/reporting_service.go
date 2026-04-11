package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
)

type ReportingService struct {
	db *sqlx.DB
}

type RevenuePoint struct {
	Date   string          `json:"date"`
	Amount decimal.Decimal `json:"amount"`
}

type SuccessRatePoint struct {
	Date        string  `json:"date"`
	SuccessRate float64 `json:"success_rate"`
}

type PaymentMethodPoint struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

type RecentTransaction struct {
	ID              string          `json:"id"`
	Amount          decimal.Decimal `json:"amount"`
	Status          string          `json:"status"`
	Date            time.Time       `json:"date"`
	Method          string          `json:"method"`
	Email           string          `json:"customer_email"`
	FraudScore      *int            `json:"fraud_score"`
	RoutingDecision json.RawMessage `json:"routing_decision"` // Parse into raw json
}

type DashboardOverview struct {
	TotalRevenue       decimal.Decimal      `json:"total_revenue"`
	TotalTransactions  int64                `json:"total_transactions"`
	SuccessRate        float64              `json:"success_rate"`
	ActiveCustomers    int64                `json:"active_customers"`
	RevenueTrend       []RevenuePoint       `json:"revenue_trend"`
	PaymentMethodSplit []PaymentMethodPoint `json:"payment_method_breakdown"`
	RecentTransactions []RecentTransaction  `json:"recent_transactions"`
}

type AnalyticsResponse struct {
	TotalRevenue           decimal.Decimal    `json:"totalRevenue"`
	SuccessRate            float64            `json:"successRate"`
	TransactionCount       int64              `json:"transactionCount"`
	AverageOrderValue      decimal.Decimal    `json:"averageOrderValue"`
	PaymentMethodBreakdown map[string]int64   `json:"paymentMethodBreakdown"`
	RevenueByDay           []RevenuePoint     `json:"revenueByDay"`
	SuccessRateByDay       []SuccessRatePoint `json:"successRateByDay"`
}

type MerchantStats struct {
	TotalTransactions  int64           `json:"total_transactions"`
	TotalRevenue       decimal.Decimal `json:"total_revenue"`
	SuccessRate        float64         `json:"success_rate"`
	PendingSettlements int64           `json:"pending_settlements"`
}

func NewReportingService(db *sqlx.DB) *ReportingService {
	return &ReportingService{db: db}
}

func (s *ReportingService) GetMerchantStats(ctx context.Context, merchantID uuid.UUID) (*MerchantStats, error) {
	var totalTx int64
	if err := s.db.GetContext(ctx, &totalTx, `SELECT COUNT(*) FROM transactions WHERE merchant_id = $1`, merchantID); err != nil {
		return nil, err
	}

	var successTx int64
	if err := s.db.GetContext(ctx, &successTx, `SELECT COUNT(*) FROM transactions WHERE merchant_id = $1 AND status = 'success'`, merchantID); err != nil {
		return nil, err
	}

	var revenue decimal.Decimal
	if err := s.db.GetContext(ctx, &revenue, `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = $1 AND status = 'success'`, merchantID); err != nil {
		return nil, err
	}

	var pendingSettlements int64
	_ = s.db.GetContext(ctx, &pendingSettlements, `SELECT COUNT(*) FROM settlements WHERE merchant_id = $1 AND status != 'settled'`, merchantID)

	successRate := 0.0
	if totalTx > 0 {
		successRate = (float64(successTx) / float64(totalTx)) * 100
	}

	return &MerchantStats{
		TotalTransactions:  totalTx,
		TotalRevenue:       revenue,
		SuccessRate:        successRate,
		PendingSettlements: pendingSettlements,
	}, nil
}

func (s *ReportingService) GetDashboardOverview(ctx context.Context, merchantID uuid.UUID, start time.Time, end time.Time) (*DashboardOverview, error) {
	var totalTx int64
	if err := s.db.GetContext(ctx, &totalTx, `
		SELECT COUNT(*)
		FROM transactions
		WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end); err != nil {
		return nil, err
	}

	var successTx int64
	if err := s.db.GetContext(ctx, &successTx, `
		SELECT COUNT(*)
		FROM transactions
		WHERE merchant_id = $1 AND status = 'success' AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end); err != nil {
		return nil, err
	}

	var revenue decimal.Decimal
	if err := s.db.GetContext(ctx, &revenue, `
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE merchant_id = $1 AND status = 'success' AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end); err != nil {
		return nil, err
	}

	var activeCustomers int64
	_ = s.db.GetContext(ctx, &activeCustomers, `
		SELECT COUNT(DISTINCT customer_email)
		FROM transactions
		WHERE merchant_id = $1 AND customer_email IS NOT NULL AND customer_email <> '' AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end)

	successRate := 0.0
	if totalTx > 0 {
		successRate = (float64(successTx) / float64(totalTx)) * 100
	}

	var revenueTrend []RevenuePoint
	_ = s.db.SelectContext(ctx, &revenueTrend, `
		SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS date,
		       COALESCE(SUM(amount), 0) AS amount
		FROM transactions
		WHERE merchant_id = $1 AND status = 'success' AND created_at >= $2 AND created_at < $3
		GROUP BY 1
		ORDER BY MIN(created_at)
	`, merchantID, start, end)

	var split []PaymentMethodPoint
	_ = s.db.SelectContext(ctx, &split, `
		SELECT INITCAP(payment_method) AS name, COUNT(*) AS value
		FROM transactions
		WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3
		GROUP BY 1
		ORDER BY value DESC
	`, merchantID, start, end)

	var recent []RecentTransaction
	_ = s.db.SelectContext(ctx, &recent, `
		SELECT id::text AS id, amount, status, created_at AS date, INITCAP(payment_method) AS method, customer_email, fraud_score, routing_decision
		FROM transactions
		WHERE merchant_id = $1
		ORDER BY created_at DESC
		LIMIT 10
	`, merchantID)

	return &DashboardOverview{
		TotalRevenue:       revenue,
		TotalTransactions:  totalTx,
		SuccessRate:        successRate,
		ActiveCustomers:    activeCustomers,
		RevenueTrend:       revenueTrend,
		PaymentMethodSplit: split,
		RecentTransactions: recent,
	}, nil
}

func (s *ReportingService) GetAnalytics(ctx context.Context, merchantID uuid.UUID, start time.Time, end time.Time) (*AnalyticsResponse, error) {
	var txCount int64
	if err := s.db.GetContext(ctx, &txCount, `
		SELECT COUNT(*)
		FROM transactions
		WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end); err != nil {
		return nil, err
	}

	var successTx int64
	if err := s.db.GetContext(ctx, &successTx, `
		SELECT COUNT(*)
		FROM transactions
		WHERE merchant_id = $1 AND status = 'success' AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end); err != nil {
		return nil, err
	}

	var revenue decimal.Decimal
	if err := s.db.GetContext(ctx, &revenue, `
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE merchant_id = $1 AND status = 'success' AND created_at >= $2 AND created_at < $3
	`, merchantID, start, end); err != nil {
		return nil, err
	}

	avg := decimal.Zero
	if txCount > 0 {
		avg = revenue.Div(decimal.NewFromInt(txCount))
	}

	successRate := 0.0
	if txCount > 0 {
		successRate = (float64(successTx) / float64(txCount)) * 100
	}

	var byDay []RevenuePoint
	_ = s.db.SelectContext(ctx, &byDay, `
		SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS date,
		       COALESCE(SUM(amount), 0) AS amount
		FROM transactions
		WHERE merchant_id = $1 AND status = 'success' AND created_at >= $2 AND created_at < $3
		GROUP BY 1
		ORDER BY MIN(created_at)
	`, merchantID, start, end)

	var successByDay []SuccessRatePoint
	_ = s.db.SelectContext(ctx, &successByDay, `
		SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS date,
		       CASE WHEN COUNT(*) = 0 THEN 0
		            ELSE (COUNT(*) FILTER (WHERE status = 'success')::float / COUNT(*)::float) * 100
		       END AS success_rate
		FROM transactions
		WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3
		GROUP BY 1
		ORDER BY MIN(created_at)
	`, merchantID, start, end)

	tmp := []PaymentMethodPoint{}
	_ = s.db.SelectContext(ctx, &tmp, `
		SELECT LOWER(payment_method) AS name, COUNT(*) AS value
		FROM transactions
		WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3
		GROUP BY 1
	`, merchantID, start, end)

	breakdown := make(map[string]int64, len(tmp))
	for _, p := range tmp {
		breakdown[p.Name] = p.Value
	}

	return &AnalyticsResponse{
		TotalRevenue:           revenue,
		SuccessRate:            successRate,
		TransactionCount:       txCount,
		AverageOrderValue:      avg,
		PaymentMethodBreakdown: breakdown,
		RevenueByDay:           byDay,
		SuccessRateByDay:       successByDay,
	}, nil
}
