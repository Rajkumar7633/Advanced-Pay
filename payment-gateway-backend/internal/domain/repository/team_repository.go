package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/yourcompany/payment-gateway/internal/domain/models"
)

type teamRepository struct {
	db *sqlx.DB
}

func NewTeamRepository(db *sqlx.DB) TeamRepository {
	return &teamRepository{db: db}
}

func (r *teamRepository) Create(ctx context.Context, member *models.TeamMember) error {
	query := `
		INSERT INTO team_members (
			id, merchant_id, name, email, role, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.db.ExecContext(ctx, query,
		member.ID, member.MerchantID, member.Name, member.Email,
		member.Role, member.Status, member.CreatedAt, member.UpdatedAt,
	)
	return err
}

func (r *teamRepository) GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*models.TeamMember, error) {
	query := `
		SELECT id, merchant_id, name, email, role, status, created_at, updated_at
		FROM team_members
		WHERE merchant_id = $1
		ORDER BY created_at ASC`

	var members []*models.TeamMember
	err := r.db.SelectContext(ctx, &members, query, merchantID)
	if err != nil {
		return nil, err
	}

	return members, nil
}

func (r *teamRepository) Delete(ctx context.Context, id uuid.UUID, merchantID uuid.UUID) error {
	query := `DELETE FROM team_members WHERE id = $1 AND merchant_id = $2`
	_, err := r.db.ExecContext(ctx, query, id, merchantID)
	return err
}
