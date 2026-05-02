package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type transactionRepository struct {
	db *sqlx.DB
}

// NewTransactionRepository creates a new transaction repository
func NewTransactionRepository(db *sqlx.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

func (r *transactionRepository) Create(ctx context.Context, tx *models.Transaction) error {
	query := `
		INSERT INTO transactions (
			id, merchant_id, order_id, amount, currency, status,
			payment_method, payment_provider, customer_email, customer_phone,
			customer_ip, device_fingerprint, fraud_score, routing_decision,
			metadata, settlement_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)`

	routingJSON, _ := json.Marshal(tx.RoutingDecision)
	metadataJSON, _ := json.Marshal(tx.Metadata)

	_, err := r.db.ExecContext(ctx, query,
		tx.ID, tx.MerchantID, tx.OrderID, tx.Amount, tx.Currency, tx.Status,
		tx.PaymentMethod, tx.PaymentProvider, tx.CustomerEmail, tx.CustomerPhone,
		tx.CustomerIP, tx.DeviceFingerprint, tx.FraudScore, routingJSON,
		metadataJSON, tx.SettlementID, tx.CreatedAt, tx.UpdatedAt,
	)

	return err
}

func (r *transactionRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Transaction, error) {
	query := `
		SELECT 
			id, merchant_id, order_id, amount, currency, status,
			payment_method, payment_provider, customer_email, customer_phone,
			customer_ip, device_fingerprint, fraud_score, routing_decision,
			metadata, settlement_id, created_at, updated_at, completed_at
		FROM transactions
		WHERE id = $1`

	var tx models.Transaction
	var routingJSON, metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&tx.ID, &tx.MerchantID, &tx.OrderID, &tx.Amount, &tx.Currency, &tx.Status,
		&tx.PaymentMethod, &tx.PaymentProvider, &tx.CustomerEmail, &tx.CustomerPhone,
		&tx.CustomerIP, &tx.DeviceFingerprint, &tx.FraudScore, &routingJSON,
		&metadataJSON, &tx.SettlementID, &tx.CreatedAt, &tx.UpdatedAt, &tx.CompletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, err
	}

	if len(routingJSON) > 0 {
		json.Unmarshal(routingJSON, &tx.RoutingDecision)
	}
	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &tx.Metadata)
	}

	return &tx, nil
}

func (r *transactionRepository) GetByOrderID(ctx context.Context, merchantID uuid.UUID, orderID string) (*models.Transaction, error) {
	query := `
		SELECT 
			id, merchant_id, order_id, amount, currency, status,
			payment_method, payment_provider, customer_email, customer_phone,
			customer_ip, device_fingerprint, fraud_score, routing_decision,
			metadata, settlement_id, created_at, updated_at, completed_at
		FROM transactions
		WHERE merchant_id = $1 AND order_id = $2`

	var tx models.Transaction
	var routingJSON, metadataJSON []byte

	err := r.db.QueryRowContext(ctx, query, merchantID, orderID).Scan(
		&tx.ID, &tx.MerchantID, &tx.OrderID, &tx.Amount, &tx.Currency, &tx.Status,
		&tx.PaymentMethod, &tx.PaymentProvider, &tx.CustomerEmail, &tx.CustomerPhone,
		&tx.CustomerIP, &tx.DeviceFingerprint, &tx.FraudScore, &routingJSON,
		&metadataJSON, &tx.SettlementID, &tx.CreatedAt, &tx.UpdatedAt, &tx.CompletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("transaction not found")
		}
		return nil, err
	}

	if len(routingJSON) > 0 {
		json.Unmarshal(routingJSON, &tx.RoutingDecision)
	}
	if len(metadataJSON) > 0 {
		json.Unmarshal(metadataJSON, &tx.Metadata)
	}

	return &tx, nil
}

func (r *transactionRepository) List(ctx context.Context, merchantID uuid.UUID, filters TransactionFilters) ([]*models.Transaction, int64, error) {
	// Build query with filters
	query := `
		SELECT 
			id, merchant_id, order_id, amount, currency, status,
			payment_method, payment_provider, customer_email, customer_phone,
			customer_ip, device_fingerprint, fraud_score, routing_decision,
			metadata, settlement_id, created_at, updated_at, completed_at
		FROM transactions
		WHERE merchant_id = $1`

	countQuery := `SELECT COUNT(*) FROM transactions WHERE merchant_id = $1`

	args := []interface{}{merchantID}
	argCount := 1

	if filters.Status != "" {
		argCount++
		query += fmt.Sprintf(" AND status = $%d", argCount)
		countQuery += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, filters.Status)
	}

	if filters.PaymentMethod != "" {
		argCount++
		query += fmt.Sprintf(" AND payment_method = $%d", argCount)
		countQuery += fmt.Sprintf(" AND payment_method = $%d", argCount)
		args = append(args, filters.PaymentMethod)
	}

	if !filters.StartDate.IsZero() {
		argCount++
		query += fmt.Sprintf(" AND created_at >= $%d", argCount)
		countQuery += fmt.Sprintf(" AND created_at >= $%d", argCount)
		args = append(args, filters.StartDate)
	}

	if !filters.EndDate.IsZero() {
		argCount++
		query += fmt.Sprintf(" AND created_at <= $%d", argCount)
		countQuery += fmt.Sprintf(" AND created_at <= $%d", argCount)
		args = append(args, filters.EndDate)
	}

	// Get total count
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Add pagination
	query += " ORDER BY created_at DESC"
	if filters.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filters.Limit)
	}
	if filters.Offset > 0 {
		argCount++
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, filters.Offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		var routingJSON, metadataJSON []byte

		err := rows.Scan(
			&tx.ID, &tx.MerchantID, &tx.OrderID, &tx.Amount, &tx.Currency, &tx.Status,
			&tx.PaymentMethod, &tx.PaymentProvider, &tx.CustomerEmail, &tx.CustomerPhone,
			&tx.CustomerIP, &tx.DeviceFingerprint, &tx.FraudScore, &routingJSON,
			&metadataJSON, &tx.SettlementID, &tx.CreatedAt, &tx.UpdatedAt, &tx.CompletedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		if len(routingJSON) > 0 {
			json.Unmarshal(routingJSON, &tx.RoutingDecision)
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &tx.Metadata)
		}

		transactions = append(transactions, &tx)
	}

	return transactions, total, nil
}

func (r *transactionRepository) Update(ctx context.Context, tx *models.Transaction) error {
	query := `
		UPDATE transactions
		SET status = $1, payment_provider = $2, fraud_score = $3,
		    routing_decision = $4, updated_at = $5, completed_at = $6
		WHERE id = $7`

	routingJSON, _ := json.Marshal(tx.RoutingDecision)

	_, err := r.db.ExecContext(ctx, query,
		tx.Status, tx.PaymentProvider, tx.FraudScore, routingJSON,
		tx.UpdatedAt, tx.CompletedAt, tx.ID,
	)

	return err
}

func (r *transactionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

// GetCustomersByMerchant retrieves transactions with customer data for customers aggregation
func (r *transactionRepository) GetCustomersByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*models.Transaction, error) {
	query := `
		SELECT 
			id, merchant_id, order_id, amount, currency, status,
			payment_method, payment_provider, fraud_score, routing_decision,
			customer_email, customer_phone, created_at, updated_at, completed_at,
			metadata
		FROM transactions 
		WHERE merchant_id = $1 
		AND customer_email IS NOT NULL 
		AND customer_email != ''
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, merchantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		var customerEmail, customerPhone sql.NullString
		var fraudScore sql.NullInt64
		var completedAt sql.NullTime
		var routingDecisionJSON []byte
		var metadataJSON []byte

		err := rows.Scan(
			&tx.ID, &tx.MerchantID, &tx.OrderID, &tx.Amount, &tx.Currency, &tx.Status,
			&tx.PaymentMethod, &tx.PaymentProvider, &fraudScore, &routingDecisionJSON,
			&customerEmail, &customerPhone, &tx.CreatedAt, &tx.UpdatedAt, &completedAt,
			&metadataJSON,
		)
		if err != nil {
			return nil, err
		}

		if customerEmail.Valid {
			tx.CustomerEmail = customerEmail.String
		}
		if customerPhone.Valid {
			tx.CustomerPhone = customerPhone.String
		}
		if fraudScore.Valid {
			score := int(fraudScore.Int64)
			tx.FraudScore = &score
		}
		if completedAt.Valid {
			tx.CompletedAt = &completedAt.Time
		}

		if len(routingDecisionJSON) > 0 {
			json.Unmarshal(routingDecisionJSON, &tx.RoutingDecision)
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &tx.Metadata)
		}

		transactions = append(transactions, &tx)
	}

	return transactions, nil
}
func (r *transactionRepository) GetUnsettled(ctx context.Context) ([]*models.Transaction, error) {
	query := `
		SELECT 
			id, merchant_id, order_id, amount, currency, status,
			payment_method, payment_provider, customer_email, customer_phone,
			customer_ip, device_fingerprint, fraud_score, routing_decision,
			metadata, settlement_id, created_at, updated_at, completed_at
		FROM transactions
		WHERE status = 'success' AND settlement_id IS NULL
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		var tx models.Transaction
		var routingJSON, metadataJSON []byte

		err := rows.Scan(
			&tx.ID, &tx.MerchantID, &tx.OrderID, &tx.Amount, &tx.Currency, &tx.Status,
			&tx.PaymentMethod, &tx.PaymentProvider, &tx.CustomerEmail, &tx.CustomerPhone,
			&tx.CustomerIP, &tx.DeviceFingerprint, &tx.FraudScore, &routingJSON,
			&metadataJSON, &tx.SettlementID, &tx.CreatedAt, &tx.UpdatedAt, &tx.CompletedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(routingJSON) > 0 {
			json.Unmarshal(routingJSON, &tx.RoutingDecision)
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &tx.Metadata)
		}

		transactions = append(transactions, &tx)
	}

	return transactions, nil
}

func (r *transactionRepository) MarkAsSettled(ctx context.Context, txIDs []uuid.UUID, settlementID uuid.UUID) error {
	if len(txIDs) == 0 {
		return nil
	}

	query := `UPDATE transactions SET settlement_id = $1, updated_at = NOW() WHERE id = ANY($2)`
	_, err := r.db.ExecContext(ctx, query, settlementID, pq.Array(txIDs))
	return err
}

func (r *transactionRepository) GetHighRiskTransactions(ctx context.Context, threshold int) ([]*models.Transaction, error) {
	query := `
		SELECT 
			t.id, t.merchant_id, COALESCE(m.business_name, 'Unknown') as merchant_name,
			t.order_id, t.amount, t.currency, t.status,
			t.payment_method, t.payment_provider, t.customer_email, t.customer_phone,
			t.customer_ip, t.device_fingerprint, t.fraud_score, t.routing_decision,
			t.metadata, t.settlement_id, t.created_at, t.updated_at
		FROM transactions t
		LEFT JOIN merchants m ON t.merchant_id = m.id
		WHERE t.fraud_score >= $1 
		ORDER BY t.created_at DESC LIMIT 50`

	var dbTxs []struct {
		models.Transaction
		RoutingJSON  []byte `db:"routing_decision"`
		MetadataJSON []byte `db:"metadata"`
	}

	err := r.db.SelectContext(ctx, &dbTxs, query, threshold)
	if err != nil {
		if err == sql.ErrNoRows {
			return []*models.Transaction{}, nil
		}
		return nil, err
	}

	var results []*models.Transaction
	for _, dbTx := range dbTxs {
		tx := dbTx.Transaction
		if len(dbTx.RoutingJSON) > 0 {
			_ = json.Unmarshal(dbTx.RoutingJSON, &tx.RoutingDecision)
		}
		if len(dbTx.MetadataJSON) > 0 {
			_ = json.Unmarshal(dbTx.MetadataJSON, &tx.Metadata)
		}
		results = append(results, &tx)
	}

	return results, nil
}
