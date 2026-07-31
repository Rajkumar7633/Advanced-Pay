package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// InvoiceService handles invoice generation and management
type InvoiceService struct {
	logger *logger.Logger
}

func NewInvoiceService(log *logger.Logger) *InvoiceService {
	return &InvoiceService{
		logger: log,
	}
}

// Invoice represents an invoice
type Invoice struct {
	ID             uuid.UUID              `json:"id"`
	InvoiceNumber  string                 `json:"invoice_number"`
	MerchantID     uuid.UUID              `json:"merchant_id"`
	CustomerID     uuid.UUID              `json:"customer_id"`
	CustomerName   string                 `json:"customer_name"`
	CustomerEmail  string                 `json:"customer_email"`
	CustomerPhone  string                 `json:"customer_phone"`
	BillingAddress *Address               `json:"billing_address"`
	Items          []InvoiceItem          `json:"items"`
	Subtotal       decimal.Decimal        `json:"subtotal"`
	Tax            decimal.Decimal        `json:"tax"`
	Discount       decimal.Decimal        `json:"discount"`
	Total          decimal.Decimal        `json:"total"`
	Currency       string                 `json:"currency"`
	Status         string                 `json:"status"` // draft, pending, paid, overdue, cancelled
	DueDate        time.Time              `json:"due_date"`
	PaidDate       *time.Time             `json:"paid_date,omitempty"`
	PaymentID      *uuid.UUID             `json:"payment_id,omitempty"`
	Notes          string                 `json:"notes"`
	Metadata       map[string]interface{} `json:"metadata"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// InvoiceItem represents a line item in an invoice
type InvoiceItem struct {
	ID          uuid.UUID       `json:"id"`
	Description string          `json:"description"`
	Quantity    int             `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Amount      decimal.Decimal `json:"amount"`
	TaxRate     decimal.Decimal `json:"tax_rate"`
}

// Address represents a physical address
type Address struct {
	Line1      string `json:"line1"`
	Line2      string `json:"line2"`
	City       string `json:"city"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

// CreateInvoiceRequest represents the request to create an invoice
type CreateInvoiceRequest struct {
	MerchantID     uuid.UUID              `json:"merchant_id" binding:"required"`
	CustomerID     uuid.UUID              `json:"customer_id" binding:"required"`
	CustomerName   string                 `json:"customer_name" binding:"required"`
	CustomerEmail  string                 `json:"customer_email" binding:"required"`
	CustomerPhone  string                 `json:"customer_phone"`
	BillingAddress *Address               `json:"billing_address"`
	Items          []CreateInvoiceItem    `json:"items" binding:"required"`
	Currency       string                 `json:"currency" binding:"required"`
	DueDate        time.Time              `json:"due_date" binding:"required"`
	TaxRate        decimal.Decimal        `json:"tax_rate"`
	Discount       decimal.Decimal        `json:"discount"`
	Notes          string                 `json:"notes"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// CreateInvoiceItem represents a line item for invoice creation
type CreateInvoiceItem struct {
	Description string          `json:"description" binding:"required"`
	Quantity    int             `json:"quantity" binding:"required"`
	UnitPrice   decimal.Decimal `json:"unit_price" binding:"required"`
	TaxRate     decimal.Decimal `json:"tax_rate"`
}

// GenerateInvoice generates a new invoice
func (s *InvoiceService) GenerateInvoice(ctx context.Context, req *CreateInvoiceRequest) (*Invoice, error) {
	// Calculate invoice totals
	items := make([]InvoiceItem, len(req.Items))
	subtotal := decimal.Zero
	totalTax := decimal.Zero

	for i, item := range req.Items {
		itemAmount := item.UnitPrice.Mul(decimal.NewFromInt(int64(item.Quantity)))
		itemTax := itemAmount.Mul(item.TaxRate.Div(decimal.NewFromInt(100)))

		items[i] = InvoiceItem{
			ID:          uuid.New(),
			Description: item.Description,
			Quantity:    item.Quantity,
			UnitPrice:   item.UnitPrice,
			Amount:      itemAmount,
			TaxRate:     item.TaxRate,
		}

		subtotal = subtotal.Add(itemAmount)
		totalTax = totalTax.Add(itemTax)
	}

	// Apply discount
	discount := req.Discount
	if discount.IsNegative() {
		discount = decimal.Zero
	}

	// Calculate total
	total := subtotal.Add(totalTax).Sub(discount)

	// Generate invoice number
	invoiceNumber := s.generateInvoiceNumber(req.MerchantID)

	invoice := &Invoice{
		ID:             uuid.New(),
		InvoiceNumber:  invoiceNumber,
		MerchantID:     req.MerchantID,
		CustomerID:     req.CustomerID,
		CustomerName:   req.CustomerName,
		CustomerEmail:  req.CustomerEmail,
		CustomerPhone:  req.CustomerPhone,
		BillingAddress: req.BillingAddress,
		Items:          items,
		Subtotal:       subtotal,
		Tax:            totalTax,
		Discount:       discount,
		Total:          total,
		Currency:       req.Currency,
		Status:         "pending",
		DueDate:        req.DueDate,
		Notes:          req.Notes,
		Metadata:       req.Metadata,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	s.logger.Info("Invoice generated", "invoice_id", invoice.ID, "invoice_number", invoiceNumber)
	return invoice, nil
}

// generateInvoiceNumber generates a unique invoice number
func (s *InvoiceService) generateInvoiceNumber(merchantID uuid.UUID) string {
	timestamp := time.Now().Format("20060102")
	return fmt.Sprintf("INV-%s-%s-%d", merchantID.String()[:8], timestamp, time.Now().UnixNano()%10000)
}

// GetInvoice retrieves an invoice by ID
func (s *InvoiceService) GetInvoice(ctx context.Context, invoiceID uuid.UUID) (*Invoice, error) {
	// In production, query from database
	// For now, return mock data
	return &Invoice{
		ID:            invoiceID,
		InvoiceNumber: "INV-ABC123-20240101-1234",
		CustomerName:  "John Doe",
		CustomerEmail: "john@example.com",
		Total:         decimal.NewFromFloat(100.00),
		Currency:      "INR",
		Status:        "pending",
		DueDate:       time.Now().Add(7 * 24 * time.Hour),
		CreatedAt:     time.Now(),
	}, nil
}

// UpdateInvoice updates an existing invoice
func (s *InvoiceService) UpdateInvoice(ctx context.Context, invoiceID uuid.UUID, updates map[string]interface{}) (*Invoice, error) {
	// In production, update in database
	invoice, err := s.GetInvoice(ctx, invoiceID)
	if err != nil {
		return nil, err
	}

	if status, ok := updates["status"].(string); ok {
		invoice.Status = status
	}
	if notes, ok := updates["notes"].(string); ok {
		invoice.Notes = notes
	}

	invoice.UpdatedAt = time.Now()
	return invoice, nil
}

// MarkInvoiceAsPaid marks an invoice as paid
func (s *InvoiceService) MarkInvoiceAsPaid(ctx context.Context, invoiceID, paymentID uuid.UUID) error {
	// In production, update in database
	s.logger.Info("Invoice marked as paid", "invoice_id", invoiceID, "payment_id", paymentID)
	return nil
}

// CancelInvoice cancels an invoice
func (s *InvoiceService) CancelInvoice(ctx context.Context, invoiceID uuid.UUID) error {
	// In production, update status to cancelled
	s.logger.Info("Invoice cancelled", "invoice_id", invoiceID)
	return nil
}

// ListInvoices lists invoices for a merchant
func (s *InvoiceService) ListInvoices(ctx context.Context, merchantID uuid.UUID, filter map[string]interface{}) ([]*Invoice, error) {
	// In production, query from database with filters
	// For now, return mock data
	return []*Invoice{
		{
			ID:            uuid.New(),
			InvoiceNumber: "INV-ABC123-20240101-1234",
			MerchantID:    merchantID,
			CustomerName:  "John Doe",
			Total:         decimal.NewFromFloat(100.00),
			Currency:      "INR",
			Status:        "paid",
			DueDate:       time.Now().Add(-7 * 24 * time.Hour),
			CreatedAt:     time.Now().Add(-14 * 24 * time.Hour),
		},
	}, nil
}

// GenerateInvoiceHTML generates HTML representation of invoice
func (s *InvoiceService) GenerateInvoiceHTML(invoice *Invoice) string {
	itemsHTML := ""
	for _, item := range invoice.Items {
		itemsHTML += fmt.Sprintf(`
			<tr>
				<td>%s</td>
				<td>%d</td>
				td>%.2f</td>
				<td>%.2f</td>
				<td>%.2f</td>
			</tr>
		`, item.Description, item.Quantity, item.UnitPrice, item.TaxRate, item.Amount)
	}

	return fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Invoice %s</title>
			<style>
				body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
				.header { display: flex; justify-content: space-between; margin-bottom: 30px; }
				.invoice-details { margin-bottom: 30px; }
				table { width: 100%%; border-collapse: collapse; margin-bottom: 30px; }
				th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
				th { background-color: #f5f5f5; }
				.totals { margin-left: auto; width: 300px; }
				.total-row { display: flex; justify-content: space-between; padding: 10px 0; }
				.total-row.final { font-weight: bold; font-size: 18px; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
			</style>
		</head>
		<body>
			<div class="header">
				<div>
					<h1>INVOICE</h1>
					<p><strong>%s</strong></p>
				</div>
				<div>
					<p><strong>AdvancePay</strong></p>
					<p>Payment Gateway Services</p>
				</div>
			</div>

			<div class="invoice-details">
				<p><strong>Bill To:</strong></p>
				<p>%s</p>
				<p>%s</p>
				<p>%s</p>
			</div>

			<div class="invoice-details">
				<p><strong>Invoice Details:</strong></p>
				<p>Invoice Number: %s</p>
				<p>Invoice Date: %s</p>
				<p>Due Date: %s</p>
				<p>Status: %s</p>
			</div>

			<table>
				<thead>
					<tr>
						<th>Description</th>
						<th>Quantity</th>
						<th>Unit Price</th>
						<th>Tax Rate</th>
						<th>Amount</th>
					</tr>
				</thead>
				<tbody>
					%s
				</tbody>
			</table>

			<div class="totals">
				<div class="total-row">
					<span>Subtotal:</span>
					span>%.2f %s</span>
				</div>
				<div class="total-row">
					<span>Tax:</span>
					<span>%.2f %s</span>
				</div>
				<div class="total-row">
					<span>Discount:</span>
					<span>-%.2f %s</span>
				</div>
				<div class="total-row final">
					span>Total:</span>
					<span>%.2f %s</span>
				</div>
			</div>

			%s
		</body>
		</html>
	`, invoice.InvoiceNumber, invoice.InvoiceNumber, invoice.CustomerName, invoice.CustomerEmail, invoice.CustomerPhone, invoice.InvoiceNumber, invoice.CreatedAt.Format("2006-01-02"), invoice.DueDate.Format("2006-01-02"), invoice.Status, itemsHTML, invoice.Subtotal, invoice.Currency, invoice.Tax, invoice.Currency, invoice.Discount, invoice.Currency, invoice.Total, invoice.Currency, s.generateNotesHTML(invoice.Notes))
}

// generateNotesHTML generates HTML for invoice notes
func (s *InvoiceService) generateNotesHTML(notes string) string {
	if notes == "" {
		return ""
	}
	return fmt.Sprintf(`
		<div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
			<p><strong>Notes:</strong></p>
			<p>%s</p>
		</div>
	`, notes)
}

// GenerateInvoicePDF generates PDF representation of invoice
func (s *InvoiceService) GenerateInvoicePDF(invoice *Invoice) ([]byte, error) {
	// In production, use a PDF library like gofpdf or unidoc
	// For now, return the HTML as placeholder
	html := s.GenerateInvoiceHTML(invoice)
	return []byte(html), nil
}

// SendInvoice sends invoice to customer via email
func (s *InvoiceService) SendInvoice(ctx context.Context, invoiceID uuid.UUID) error {
	// In production, integrate with email service
	s.logger.Info("Invoice sent to customer", "invoice_id", invoiceID)
	return nil
}

// CalculateInvoiceTotals calculates invoice totals
func (s *InvoiceService) CalculateInvoiceTotals(items []InvoiceItem, taxRate, discount decimal.Decimal) (subtotal, tax, total decimal.Decimal) {
	subtotal = decimal.Zero
	tax = decimal.Zero

	for _, item := range items {
		itemAmount := item.UnitPrice.Mul(decimal.NewFromInt(int64(item.Quantity)))
		itemTax := itemAmount.Mul(item.TaxRate.Div(decimal.NewFromInt(100)))

		subtotal = subtotal.Add(itemAmount)
		tax = tax.Add(itemTax)
	}

	total = subtotal.Add(tax).Sub(discount)
	if total.IsNegative() {
		total = decimal.Zero
	}

	return subtotal, tax, total
}

// GetInvoiceSummary returns summary statistics for invoices
func (s *InvoiceService) GetInvoiceSummary(ctx context.Context, merchantID uuid.UUID, startDate, endDate time.Time) map[string]interface{} {
	return map[string]interface{}{
		"total_invoices":     500,
		"total_amount":       125000.00,
		"paid_invoices":      450,
		"paid_amount":        112500.00,
		"pending_invoices":   40,
		"pending_amount":     10000.00,
		"overdue_invoices":   10,
		"overdue_amount":     2500.00,
		"cancelled_invoices": 0,
		"cancelled_amount":   0.00,
	}
}

// ScheduleInvoice schedules a recurring invoice
func (s *InvoiceService) ScheduleInvoice(ctx context.Context, merchantID, customerID uuid.UUID, schedule string, items []CreateInvoiceItem) error {
	// In production, create a scheduled invoice job
	s.logger.Info("Invoice scheduled", "merchant_id", merchantID, "customer_id", customerID, "schedule", schedule)
	return nil
}

// ValidateInvoice validates invoice data
func (s *InvoiceService) ValidateInvoice(req *CreateInvoiceRequest) error {
	if len(req.Items) == 0 {
		return fmt.Errorf("invoice must have at least one item")
	}

	for _, item := range req.Items {
		if item.Quantity <= 0 {
			return fmt.Errorf("item quantity must be positive")
		}
		if item.UnitPrice.IsNegative() {
			return fmt.Errorf("item unit price cannot be negative")
		}
	}

	if req.DueDate.Before(time.Now()) {
		return fmt.Errorf("due date must be in the future")
	}

	return nil
}
