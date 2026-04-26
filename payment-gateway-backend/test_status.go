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
    
    var status, kycStatus string
    err := db.QueryRow("SELECT status, kyc_status FROM merchants LIMIT 1").Scan(&status, &kycStatus)
    if err != nil {
        fmt.Printf("ERR: %v\n", err)
        return
    }
    fmt.Printf("Status: %s\nKYC: %s\n", status, kycStatus)
}
