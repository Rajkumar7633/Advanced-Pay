package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents an audit trail entry for PCI DSS compliance
type AuditLog struct {
	ID             uuid.UUID              `json:"id" db:"id"`
	EntityID       uuid.UUID              `json:"entity_id" db:"entity_id"`
	EntityType     string                 `json:"entity_type" db:"entity_type"` // transaction, merchant, user, etc.
	Action         string                 `json:"action" db:"action"`           // create, update, delete, view, etc.
	ActorID        uuid.UUID              `json:"actor_id" db:"actor_id"`
	ActorType      string                 `json:"actor_type" db:"actor_type"` // user, system, api, etc.
	ActorIP        string                 `json:"actor_ip" db:"actor_ip"`
	Changes        AuditChanges           `json:"changes" db:"changes"`
	Metadata       map[string]interface{} `json:"metadata" db:"metadata"`
	Status         string                 `json:"status" db:"status"` // success, failure, pending
	FailureReason  *string                `json:"failure_reason,omitempty" db:"failure_reason"`
	SessionID      *string                `json:"session_id,omitempty" db:"session_id"`
	RequestID      *string                `json:"request_id,omitempty" db:"request_id"`
	CreatedAt      time.Time              `json:"created_at" db:"created_at"`
}

// AuditChanges represents the before/after state of changes
type AuditChanges struct {
	Before map[string]interface{} `json:"before,omitempty"`
	After  map[string]interface{} `json:"after,omitempty"`
}

// Value implements the driver.Valuer interface for AuditChanges
func (a AuditChanges) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface for AuditChanges
func (a *AuditChanges) Scan(value interface{}) error {
	if value == nil {
		*a = AuditChanges{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("type assertion to []byte failed")
	}
	return json.Unmarshal(b, a)
}

// AuditLogFilter represents filters for querying audit logs
type AuditLogFilter struct {
	EntityID   *uuid.UUID
	EntityType string
	Action     string
	ActorID    *uuid.UUID
	ActorType  string
	Status     string
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
}

// ComplianceReport represents a PCI DSS compliance report
type ComplianceReport struct {
	ReportID       uuid.UUID       `json:"report_id"`
	GeneratedAt    time.Time       `json:"generated_at"`
	PeriodStart    time.Time       `json:"period_start"`
	PeriodEnd      time.Time       `json:"period_end"`
	TotalEvents    int64           `json:"total_events"`
	ByAction       map[string]int64 `json:"by_action"`
	ByEntityType   map[string]int64 `json:"by_entity_type"`
	ByActorType    map[string]int64 `json:"by_actor_type"`
	FailedEvents   int64           `json:"failed_events"`
	SecurityEvents int64           `json:"security_events"`
	DataAccessEvents int64         `json:"data_access_events"`
}

// SecurityEvent represents a security-related audit event
type SecurityEvent struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	EventType   string                 `json:"event_type" db:"event_type"` // auth_failure, data_breach_attempt, etc.
	Severity    string                 `json:"severity" db:"severity"`    // low, medium, high, critical
	Description string                 `json:"description" db:"description"`
	SourceIP    string                 `json:"source_ip" db:"source_ip"`
	TargetID    uuid.UUID              `json:"target_id" db:"target_id"`
	TargetType  string                 `json:"target_type" db:"target_type"`
	Details     map[string]interface{} `json:"details" db:"details"`
	Resolved    bool                   `json:"resolved" db:"resolved"`
	ResolvedAt  *time.Time             `json:"resolved_at,omitempty" db:"resolved_at"`
	ResolvedBy  *uuid.UUID             `json:"resolved_by,omitempty" db:"resolved_by"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
}
