package main
import (
	"fmt"
	"context"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
    "github.com/yourcompany/payment-gateway/internal/domain/repository"
)
func main() {
    cfg, _ := config.LoadConfig()
	db, _ := database.NewPostgresDB(cfg.Database)
	defer db.Close()
	repo := repository.NewMerchantRepository(db)
    
    var mid string
    db.QueryRow("SELECT id FROM merchants LIMIT 1").Scan(&mid)
    u, _ := uuid.Parse(mid)
    
    m, _ := repo.GetByID(context.Background(), u)
    fmt.Printf("Email: %s, Business: %s\n", m.Email, m.BusinessName)
}
