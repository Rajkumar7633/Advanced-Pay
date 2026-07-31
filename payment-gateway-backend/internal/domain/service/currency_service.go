package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// CurrencyService handles multi-currency operations
type CurrencyService struct {
	rates      map[string]map[string]decimal.Decimal
	ratesMutex sync.RWMutex
	logger     *logger.Logger
	baseCurrency string
}

// NewCurrencyService creates a new currency service
func NewCurrencyService(baseCurrency string, log *logger.Logger) *CurrencyService {
	return &CurrencyService{
		rates:        make(map[string]map[string]decimal.Decimal),
		baseCurrency: baseCurrency,
		logger:       log,
	}
}

// SupportedCurrencies returns list of supported currencies
func (s *CurrencyService) SupportedCurrencies() []string {
	return []string{
		"USD", "EUR", "GBP", "INR", "JPY", "CNY", "AUD", "CAD", "SGD", "AED",
		"MYR", "THB", "IDR", "PHP", "VND", "KRW", "HKD", "CHF", "ZAR", "NGN",
		"EGP", "SAR", "BRL", "MXN", "RUB", "TRY", "PLN", "SEK", "NOK", "DKK",
	}
}

// ConvertCurrency converts amount from one currency to another
func (s *CurrencyService) ConvertCurrency(ctx context.Context, amount decimal.Decimal, fromCurrency, toCurrency string) (decimal.Decimal, error) {
	if fromCurrency == toCurrency {
		return amount, nil
	}

	// Get exchange rate
	rate, err := s.getExchangeRate(ctx, fromCurrency, toCurrency)
	if err != nil {
		return decimal.Zero, fmt.Errorf("failed to get exchange rate: %w", err)
	}

	// Convert amount
	convertedAmount := amount.Mul(rate)
	return convertedAmount, nil
}

// getExchangeRate gets exchange rate between two currencies
func (s *CurrencyService) getExchangeRate(ctx context.Context, fromCurrency, toCurrency string) (decimal.Decimal, error) {
	s.ratesMutex.RLock()
	defer s.ratesMutex.RUnlock()

	// Check if rate exists
	if rates, ok := s.rates[fromCurrency]; ok {
		if rate, ok := rates[toCurrency]; ok {
			return rate, nil
		}
	}

	// If not found, return error (in production, fetch from external API)
	return decimal.Zero, fmt.Errorf("exchange rate not found for %s to %s", fromCurrency, toCurrency)
}

// UpdateExchangeRates updates exchange rates from external source
func (s *CurrencyService) UpdateExchangeRates(ctx context.Context, rates map[string]map[string]decimal.Decimal) error {
	s.ratesMutex.Lock()
	defer s.ratesMutex.Unlock()

	// Update rates
	s.rates = rates
	s.logger.Info("Exchange rates updated", "currencies", len(rates))
	return nil
}

// GetExchangeRate gets current exchange rate
func (s *CurrencyService) GetExchangeRate(ctx context.Context, fromCurrency, toCurrency string) (decimal.Decimal, error) {
	return s.getExchangeRate(ctx, fromCurrency, toCurrency)
}

// FormatAmount formats amount with currency symbol
func (s *CurrencyService) FormatAmount(amount decimal.Decimal, currency string) string {
	symbols := map[string]string{
		"USD": "$",
		"EUR": "€",
		"GBP": "£",
		"INR": "₹",
		"JPY": "¥",
		"CNY": "¥",
		"AUD": "A$",
		"CAD": "C$",
		"SGD": "S$",
		"AED": "د.إ",
		"MYR": "RM",
		"THB": "฿",
		"IDR": "Rp",
		"PHP": "₱",
		"VND": "₫",
		"KRW": "₩",
		"HKD": "HK$",
		"CHF": "Fr",
		"ZAR": "R",
		"NGN": "₦",
		"EGP": "E£",
		"SAR": "﷼",
		"BRL": "R$",
		"MXN": "$",
		"RUB": "₽",
		"TRY": "₺",
		"PLN": "zł",
		"SEK": "kr",
		"NOK": "kr",
		"DKK": "kr",
	}

	symbol, ok := symbols[currency]
	if !ok {
		symbol = currency + " "
	}

	return symbol + amount.StringFixed(2)
}

// ValidateCurrency checks if currency is supported
func (s *CurrencyService) ValidateCurrency(currency string) bool {
	supported := s.SupportedCurrencies()
	for _, c := range supported {
		if c == currency {
			return true
		}
	}
	return false
}

// GetCurrencyInfo returns currency information
func (s *CurrencyService) GetCurrencyInfo(currency string) *CurrencyInfo {
	info := map[string]*CurrencyInfo{
		"USD": {Code: "USD", Name: "US Dollar", Symbol: "$", DecimalPlaces: 2, MinorUnit: "cent"},
		"EUR": {Code: "EUR", Name: "Euro", Symbol: "€", DecimalPlaces: 2, MinorUnit: "cent"},
		"GBP": {Code: "GBP", Name: "British Pound", Symbol: "£", DecimalPlaces: 2, MinorUnit: "penny"},
		"INR": {Code: "INR", Name: "Indian Rupee", Symbol: "₹", DecimalPlaces: 2, MinorUnit: "paisa"},
		"JPY": {Code: "JPY", Name: "Japanese Yen", Symbol: "¥", DecimalPlaces: 0, MinorUnit: "sen"},
		"CNY": {Code: "CNY", Name: "Chinese Yuan", Symbol: "¥", DecimalPlaces: 2, MinorUnit: "fen"},
		"AUD": {Code: "AUD", Name: "Australian Dollar", Symbol: "A$", DecimalPlaces: 2, MinorUnit: "cent"},
		"CAD": {Code: "CAD", Name: "Canadian Dollar", Symbol: "C$", DecimalPlaces: 2, MinorUnit: "cent"},
		"SGD": {Code: "SGD", Name: "Singapore Dollar", Symbol: "S$", DecimalPlaces: 2, MinorUnit: "cent"},
		"AED": {Code: "AED", Name: "UAE Dirham", Symbol: "د.إ", DecimalPlaces: 2, MinorUnit: "fils"},
	}

	return info[currency]
}

// CurrencyInfo represents currency information
type CurrencyInfo struct {
	Code          string
	Name          string
	Symbol        string
	DecimalPlaces int
	MinorUnit     string
}

// InitializeRates initializes with sample exchange rates
func (s *CurrencyService) InitializeRates() {
	s.ratesMutex.Lock()
	defer s.ratesMutex.Unlock()

	// Sample exchange rates (in production, fetch from external API)
	s.rates = map[string]map[string]decimal.Decimal{
		"USD": {
			"EUR": decimal.NewFromFloat(0.92),
			"GBP": decimal.NewFromFloat(0.79),
			"INR": decimal.NewFromFloat(83.50),
			"JPY": decimal.NewFromFloat(149.50),
			"CNY": decimal.NewFromFloat(7.20),
			"AUD": decimal.NewFromFloat(1.52),
			"CAD": decimal.NewFromFloat(1.36),
			"SGD": decimal.NewFromFloat(1.35),
			"AED": decimal.NewFromFloat(3.67),
		},
		"EUR": {
			"USD": decimal.NewFromFloat(1.09),
			"GBP": decimal.NewFromFloat(0.86),
			"INR": decimal.NewFromFloat(90.80),
			"JPY": decimal.NewFromFloat(162.50),
		},
		"GBP": {
			"USD": decimal.NewFromFloat(1.27),
			"EUR": decimal.NewFromFloat(1.16),
			"INR": decimal.NewFromFloat(105.80),
		},
		"INR": {
			"USD": decimal.NewFromFloat(0.012),
			"EUR": decimal.NewFromFloat(0.011),
			"GBP": decimal.NewFromFloat(0.0095),
		},
	}

	s.logger.Info("Exchange rates initialized", "base_currency", s.baseCurrency)
}

// StartRateUpdater starts periodic exchange rate updates
func (s *CurrencyService) StartRateUpdater(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("Rate updater stopped")
			return
		case <-ticker.C:
			// In production, fetch new rates from external API
			s.logger.Info("Updating exchange rates")
		}
	}
}

// ConvertToBaseCurrency converts amount to base currency
func (s *CurrencyService) ConvertToBaseCurrency(ctx context.Context, amount decimal.Decimal, currency string) (decimal.Decimal, error) {
	return s.ConvertCurrency(ctx, amount, currency, s.baseCurrency)
}

// ConvertFromBaseCurrency converts amount from base currency
func (s *CurrencyService) ConvertFromBaseCurrency(ctx context.Context, amount decimal.Decimal, currency string) (decimal.Decimal, error) {
	return s.ConvertCurrency(ctx, amount, s.baseCurrency, currency)
}

// GetBaseCurrency returns the base currency
func (s *CurrencyService) GetBaseCurrency() string {
	return s.baseCurrency
}

// CalculateCrossRate calculates cross rate between two currencies
func (s *CurrencyService) CalculateCrossRate(ctx context.Context, fromCurrency, toCurrency string) (decimal.Decimal, error) {
	if fromCurrency == toCurrency {
		return decimal.NewFromInt(1), nil
	}

	// Try direct rate first
	rate, err := s.getExchangeRate(ctx, fromCurrency, toCurrency)
	if err == nil {
		return rate, nil
	}

	// Calculate via base currency
	fromToBase, err := s.ConvertCurrency(ctx, decimal.NewFromInt(1), fromCurrency, s.baseCurrency)
	if err != nil {
		return decimal.Zero, err
	}

	baseToTarget, err := s.ConvertCurrency(ctx, decimal.NewFromInt(1), s.baseCurrency, toCurrency)
	if err != nil {
		return decimal.Zero, err
	}

	crossRate := fromToBase.Mul(baseToTarget)
	return crossRate, nil
}
