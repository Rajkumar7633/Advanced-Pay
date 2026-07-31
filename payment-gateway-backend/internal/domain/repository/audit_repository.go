package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type AuditRepository interface {
	Create(ctx context.Context, auditLog *models.AuditLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.AuditLog, error)
	Query(ctx context.Context, filter models.AuditLogFilter) ([]*models.AuditLog, int64, error)
	CreateSecurityEvent(ctx context.Context, event *models.SecurityEvent) error
	GetSecurityEventByID(ctx context.Context, id uuid.UUID) (*models.SecurityEvent, error)
	QuerySecurityEvents(ctx context.Context, filter SecurityEventFilter) ([]*models.SecurityEvent, int64, error)
	GenerateComplianceReport(ctx context.Context, periodStart, periodEnd time.Time) (*models.ComplianceReport, error)
}

type SecurityEventFilter struct {
	EventType string
	Severity  string
	Resolved  *bool
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

type auditRepository struct {
	db *sqlx.DB
}

func NewAuditRepository(db *sqlx.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) Create(ctx context.Context, auditLog *models.AuditLog) error {
	query := `
		INSERT INTO audit_logs (
			id, entity_id, entity_type, action, actor_id, actor_type, 
			actor_ip, changes, metadata, status, failure_reason, 
			session_id, request_id, created_at
		) VALUES (
			:id, :entity_id, :entity_type, :action, :actor_id, :actor_type,
			:actor_ip, :changes, :metadata, :status, :failure_reason,
			:session_id, :request_id, :created_at
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, auditLog)
	return err
}

func (r *auditRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.AuditLog, error) {
	query := `SELECT * FROM audit_logs WHERE id = $1`
	var auditLog models.AuditLog
	err := r.db.GetContext(ctx, &auditLog, query, id)
	if err != nil {
		return nil, err
	}
	return &auditLog, nil
}

func (r *auditRepository) Query(ctx context.Context, filter models.AuditLogFilter) ([]*models.AuditLog, int64, error) {
	baseQuery := `SELECT * FROM audit_logs WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM audit_logs WHERE 1=1`
	args := []interface{}{}
	argCount := 0

	if filter.EntityID != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND entity_id = $%d", argCount)
		countQuery += fmt.Sprintf(" AND entity_id = $%d", argCount)
		args = append(args, filter.EntityID)
	}

	if filter.EntityType != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND entity_type = $%d", argCount)
		countQuery += fmt.Sprintf(" AND entity_type = $%d", argCount)
		args = append(args, filter.EntityType)
	}

	if filter.Action != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND action = $%d", argCount)
		countQuery += fmt.Sprintf(" AND action = $%d", argCount)
		args = append(args, filter.Action)
	}

	if filter.ActorID != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND actor_id = $%d", argCount)
		countQuery += fmt.Sprintf(" AND actor_id = $%d", argCount)
		args = append(args, filter.ActorID)
	}

	if filter.ActorType != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND actor_type = $%d", argCount)
		countQuery += fmt.Sprintf(" AND actor_type = $%d", argCount)
		args = append(args, filter.ActorType)
	}

	if filter.Status != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND status = $%d", argCount)
		countQuery += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, filter.Status)
	}

	if filter.StartDate != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND created_at >= $%d", argCount)
		countQuery += fmt.Sprintf(" AND created_at >= $%d", argCount)
		args = append(args, filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND created_at <= $%d", argCount)
		countQuery += fmt.Sprintf(" AND created_at <= $%d", argCount)
		args = append(args, filter.EndDate)
	}

	// Get total count
	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Add pagination
	baseQuery += " ORDER BY created_at DESC"
	if filter.Limit > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filter.Limit)
	}
	if filter.Offset > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, filter.Offset)
	}

	var auditLogs []*models.AuditLog
	err = r.db.SelectContext(ctx, &auditLogs, baseQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	return auditLogs, total, nil
}

func (r *auditRepository) CreateSecurityEvent(ctx context.Context, event *models.SecurityEvent) error {
	query := `
		INSERT INTO security_events (
			id, event_type, severity, description, source_ip, 
			target_id, target_type, details, resolved, 
			resolved_at, resolved_by, created_at
		) VALUES (
			:id, :event_type, :severity, :description, :source_ip,
			:target_id, :target_type, :details, :resolved,
			:resolved_at, :resolved_by, :created_at
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, event)
	return err
}

func (r *auditRepository) GetSecurityEventByID(ctx context.Context, id uuid.UUID) (*models.SecurityEvent, error) {
	query := `SELECT * FROM security_events WHERE id = $1`
	var event models.SecurityEvent
	err := r.db.GetContext(ctx, &event, query, id)
	if err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *auditRepository) QuerySecurityEvents(ctx context.Context, filter SecurityEventFilter) ([]*models.SecurityEvent, int64, error) {
	baseQuery := `SELECT * FROM security_events WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM security_events WHERE 1=1`
	args := []interface{}{}
	argCount := 0

	if filter.EventType != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND event_type = $%d", argCount)
		countQuery += fmt.Sprintf(" AND event_type = $%d", argCount)
		args = append(args, filter.EventType)
	}

	if filter.Severity != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND severity = $%d", argCount)
		countQuery += fmt.Sprintf(" AND severity = $%d", argCount)
		args = append(args, filter.Severity)
	}

	if filter.Resolved != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND resolved = $%d", argCount)
		countQuery += fmt.Sprintf(" AND resolved = $%d", argCount)
		args = append(args, filter.Resolved)
	}

	if filter.StartDate != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND created_at >= $%d", argCount)
		countQuery += fmt.Sprintf(" AND created_at >= $%d", argCount)
		args = append(args, filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND created_at <= $%d", argCount)
		countQuery += fmt.Sprintf(" AND created_at <= $%d", argCount)
		args = append(args, filter.EndDate)
	}

	// Get total count
	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Add pagination
	baseQuery += " ORDER BY created_at DESC"
	if filter.Limit > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filter.Limit)
	}
	if filter.Offset > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, filter.Offset)
	}

	var events []*models.SecurityEvent
	err = r.db.SelectContext(ctx, &events, baseQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

func (r *auditRepository) GenerateComplianceReport(ctx context.Context, periodStart, periodEnd time.Time) (*models.ComplianceReport, error) {
	// Get total events
	var totalEvents int64
	err := r.db.GetContext(ctx, &totalEvents, `
		SELECT COUNT(*) FROM audit_logs 
		WHERE created_at >= $1 AND created_at <= $2
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}

	// Get events by action
	byAction := make(map[string]int64)
	rows, err := r.db.QueryContext(ctx, `
		SELECT action, COUNT(*) as count FROM audit_logs 
		WHERE created_at >= $1 AND created_at <= $2
		GROUP BY action
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var action string
		var count int64
		if err := rows.Scan(&action, &count); err != nil {
			continue
		}
		byAction[action] = count
	}

	// Get events by entity type
	byEntityType := make(map[string]int64)
	rows, err = r.db.QueryContext(ctx, `
		SELECT entity_type, COUNT(*) as count FROM audit_logs 
		WHERE created_at >= $1 AND created_at <= $2
		GROUP BY entity_type
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var entityType string
		var count int64
		if err := rows.Scan(&entityType, &count); err != nil {
			continue
		}
		byEntityType[entityType] = count
	}

	// Get events by actor type
	byActorType := make(map[string]int64)
	rows, err = r.db.QueryContext(ctx, `
		SELECT actor_type, COUNT(*) as count FROM audit_logs 
		WHERE created_at >= $1 AND created_at <= $2
		GROUP BY actor_type
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var actorType string
		var count int64
		if err := rows.Scan(&actorType, &count); err != nil {
			continue
		}
		byActorType[actorType] = count
	}

	// Get failed events
	var failedEvents int64
	err = r.db.GetContext(ctx, &failedEvents, `
		SELECT COUNT(*) FROM audit_logs 
		WHERE created_at >= $1 AND created_at <= $2 AND status = 'failure'
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}

	// Get security events
	var securityEvents int64
	err = r.db.GetContext(ctx, &securityEvents, `
		SELECT COUNT(*) FROM security_events 
		WHERE created_at >= $1 AND created_at <= $2
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}

	// Get data access events (view action on sensitive entities)
	var dataAccessEvents int64
	err = r.db.GetContext(ctx, &dataAccessEvents, `
		SELECT COUNT(*) FROM audit_logs 
		WHERE created_at >= $1 AND created_at <= $2 
		AND action = 'view' 
		AND entity_type IN ('transaction', 'merchant', 'user')
	`, periodStart, periodEnd)
	if err != nil {
		return nil, err
	}

	return &models.ComplianceReport{
		ReportID:         uuid.New(),
		GeneratedAt:      time.Now(),
		PeriodStart:      periodStart,
		PeriodEnd:        periodEnd,
		TotalEvents:      totalEvents,
		ByAction:         byAction,
		ByEntityType:     byEntityType,
		ByActorType:      byActorType,
		FailedEvents:     failedEvents,
		SecurityEvents:   securityEvents,
		DataAccessEvents: dataAccessEvents,
	}, nil
}
