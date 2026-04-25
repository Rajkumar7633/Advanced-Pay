package main
import (
	"fmt"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/database"
)
func main() {
	cfg, _ := config.LoadConfig()
	db, _ := database.NewPostgresDB(cfg.Database)
	defer db.Close()
	rows, err := db.Query("SELECT column_name FROM information_schema.columns WHERE table_name = 'api_keys'")
	if err != nil {
		fmt.Printf("ERR: %v\n", err)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		rows.Scan(&name)
		fmt.Printf("Column: %s\n", name)
	}
}
