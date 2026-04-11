package forex

import (
	"errors"
	"strings"

	"github.com/shopspring/decimal"
)

// ForexService defines the abstraction for acquiring live Spot rates
type ForexService struct {
	BaseCurrency string
}

// NewForexService initializes the engine
func NewForexService(baseCurrency string) *ForexService {
	if baseCurrency == "" {
		baseCurrency = "INR" // Domestic default
	}
	return &ForexService{BaseCurrency: strings.ToUpper(baseCurrency)}
}

// GetLiveSpot fetches the exact float multiplier against the global API 
func (f *ForexService) GetLiveSpot(foreignCurrency string) (decimal.Decimal, error) {
	currency := strings.ToUpper(foreignCurrency)
	
	// If the charge is identical to domestic layout, 1.0 multiplier is guaranteed
	if currency == f.BaseCurrency {
		return decimal.NewFromFloat(1.0000), nil
	}

	// This implies an integration with an external API like OpenExchangeRates or Fixer.IO
	// For immediate localized execution testing, we establish a fixed simulated matrix.
	var spotRate float64

	switch currency {
	case "USD":
		spotRate = 83.21 // 1 USD = 83.21 INR
	case "EUR":
		spotRate = 90.00
	case "GBP":
		spotRate = 105.10
	case "AED":
		spotRate = 22.65
	case "AUD":
		spotRate = 54.30
	case "SGD":
		spotRate = 61.50
	default:
		return decimal.Zero, errors.New("unsupported foreign currency pairing or routing exception")
	}

	return decimal.NewFromFloat(spotRate), nil
}

// Convert precisely factors the floating value dynamically 
func (f *ForexService) Convert(amount decimal.Decimal, foreignCurrency string) (decimal.Decimal, decimal.Decimal, error) {
	rate, err := f.GetLiveSpot(foreignCurrency)
	if err != nil {
		return decimal.Zero, decimal.Zero, err
	}
	
	baseAmount := amount.Mul(rate).Round(2) // Standardize to cent limits
	return baseAmount, rate, nil
}
