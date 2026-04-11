package main

import (
    "context"
    "fmt"
    "github.com/google/uuid"
    "github.com/yourcompany/payment-gateway/internal/config"
    "github.com/yourcompany/payment-gateway/internal/infrastructure/database"
    "github.com/yourcompany/payment-gateway/internal/domain/repository"
)

func main() {
    cfg, _ := config.LoadConfig()
    db, err := database.NewPostgresDB(cfg.Database)
    if err != nil { fmt.Println(err); return }
    repo := repository.NewPaymentLinkRepository(db)
    
    mid := uuid.MustParse("ef7ce55b-8f0b-4ddf-ba4d-f118b2e4817c")
    links, err := repo.GetByMerchantID(context.Background(), mid)
    
    fmt.Printf("Error: %v\n", err)
    fmt.Printf("Links: %#v\n", links)
    for _, l := range links {
        fmt.Printf("- Link ID: %s, Desc: %v\n", l.ID, l.Description)
    }
}
