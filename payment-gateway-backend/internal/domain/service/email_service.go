package service

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"

	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type EmailService struct {
	cfg    config.SMTPConfig
	logger *logger.Logger
}

func NewEmailService(cfg config.SMTPConfig, logger *logger.Logger) *EmailService {
	return &EmailService{
		cfg:    cfg,
		logger: logger,
	}
}

// SendApprovalEmail dispatches the welcome payload to a newly verified merchant.
func (s *EmailService) SendApprovalEmail(merchantEmail string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping approval email.", "target", merchantEmail)
		return
	}

	subject := "Welcome to Advanced Pay - Your Account is Active!"
	body := `
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #4F46E5;">Welcome to Advanced Pay!</h2>
			<p>Congratulations!</p>
			<p>Our risk team has completed reviewing your KYC documents and your Advanced Pay merchant account has been officially <strong>Approved</strong>.</p>
			<p>You can now generate live API keys and begin routing transactions immediately.</p>
			<p>Log in to your Developer Studio to get started.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`

	err := s.sendHTML(merchantEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch approval email", "merchant", merchantEmail, "error", err)
	} else {
		s.logger.Info("Approval email successfully dispatched", "merchant", merchantEmail)
	}
}

// SendPaymentSuccessEmail sends email when payment is successful
func (s *EmailService) SendPaymentSuccessEmail(customerEmail, customerName, orderID string, amount float64, currency string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping payment success email.", "target", customerEmail)
		return
	}

	subject := "Payment Successful - " + orderID
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #10B981;">Payment Successful!</h2>
			<p>Dear %s,</p>
			<p>Your payment of <strong>%.2f %s</strong> for order <strong>%s</strong> has been successfully processed.</p>
			<p>Thank you for your payment.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, customerName, amount, currency, orderID)

	err := s.sendHTML(customerEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch payment success email", "customer", customerEmail, "error", err)
	} else {
		s.logger.Info("Payment success email successfully dispatched", "customer", customerEmail)
	}
}

// SendPaymentFailedEmail sends email when payment fails
func (s *EmailService) SendPaymentFailedEmail(customerEmail, customerName, orderID string, amount float64, currency, reason string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping payment failed email.", "target", customerEmail)
		return
	}

	subject := "Payment Failed - " + orderID
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #EF4444;">Payment Failed</h2>
			<p>Dear %s,</p>
			<p>Your payment of <strong>%.2f %s</strong> for order <strong>%s</strong> could not be processed.</p>
			<p><strong>Reason:</strong> %s</p>
			<p>Please try again or contact support if the issue persists.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, customerName, amount, currency, orderID, reason)

	err := s.sendHTML(customerEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch payment failed email", "customer", customerEmail, "error", err)
	} else {
		s.logger.Info("Payment failed email successfully dispatched", "customer", customerEmail)
	}
}

// SendRefundProcessedEmail sends email when refund is processed
func (s *EmailService) SendRefundProcessedEmail(customerEmail, customerName, transactionID string, amount float64, currency string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping refund processed email.", "target", customerEmail)
		return
	}

	subject := "Refund Processed - " + transactionID
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #3B82F6;">Refund Processed</h2>
			<p>Dear %s,</p>
			<p>Your refund of <strong>%.2f %s</strong> for transaction <strong>%s</strong> has been successfully processed.</p>
			<p>The refund will be credited to your original payment method within 5-7 business days.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, customerName, amount, currency, transactionID)

	err := s.sendHTML(customerEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch refund processed email", "customer", customerEmail, "error", err)
	} else {
		s.logger.Info("Refund processed email successfully dispatched", "customer", customerEmail)
	}
}

// SendSubscriptionCreatedEmail sends email when subscription is created
func (s *EmailService) SendSubscriptionCreatedEmail(customerEmail, customerName, subscriptionID string, amount float64, currency, interval string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping subscription created email.", "target", customerEmail)
		return
	}

	subject := "Subscription Created Successfully"
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #4F46E5;">Subscription Created</h2>
			<p>Dear %s,</p>
			<p>Your subscription <strong>%s</strong> has been successfully created.</p>
			<p><strong>Amount:</strong> %.2f %s</p>
			<p><strong>Billing Interval:</strong> %s</p>
			<p>You will be charged automatically according to your billing cycle.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, customerName, subscriptionID, amount, currency, interval)

	err := s.sendHTML(customerEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch subscription created email", "customer", customerEmail, "error", err)
	} else {
		s.logger.Info("Subscription created email successfully dispatched", "customer", customerEmail)
	}
}

// SendSubscriptionCancelledEmail sends email when subscription is cancelled
func (s *EmailService) SendSubscriptionCancelledEmail(customerEmail, customerName, subscriptionID string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping subscription cancelled email.", "target", customerEmail)
		return
	}

	subject := "Subscription Cancelled"
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #F59E0B;">Subscription Cancelled</h2>
			<p>Dear %s,</p>
			<p>Your subscription <strong>%s</strong> has been cancelled.</p>
			<p>You will no longer be charged for this subscription.</p>
			<p>Thank you for using Advanced Pay.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, customerName, subscriptionID)

	err := s.sendHTML(customerEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch subscription cancelled email", "customer", customerEmail, "error", err)
	} else {
		s.logger.Info("Subscription cancelled email successfully dispatched", "customer", customerEmail)
	}
}

// SendInvoiceEmail sends invoice to customer
func (s *EmailService) SendInvoiceEmail(customerEmail, customerName, invoiceNumber string, amount float64, currency string, dueDate string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping invoice email.", "target", customerEmail)
		return
	}

	subject := "Invoice - " + invoiceNumber
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #4F46E5;">Invoice %s</h2>
			<p>Dear %s,</p>
			<p>Please find below your invoice details:</p>
			<p><strong>Amount:</strong> %.2f %s</p>
			<p><strong>Due Date:</strong> %s</p>
			<p>Please ensure payment is made by the due date to avoid late fees.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, invoiceNumber, customerName, amount, currency, dueDate)

	err := s.sendHTML(customerEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch invoice email", "customer", customerEmail, "error", err)
	} else {
		s.logger.Info("Invoice email successfully dispatched", "customer", customerEmail)
	}
}

// SendFraudAlertEmail sends fraud alert to merchant
func (s *EmailService) SendFraudAlertEmail(merchantEmail, transactionID string, fraudScore float64, riskLevel string) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping fraud alert email.", "target", merchantEmail)
		return
	}

	subject := "Fraud Alert - " + transactionID
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #EF4444;">Fraud Alert</h2>
			<p>A transaction has been flagged for potential fraud:</p>
			<p><strong>Transaction ID:</strong> %s</p>
			<p><strong>Fraud Score:</strong> %.2f</p>
			<p><strong>Risk Level:</strong> %s</p>
			<p>Please review this transaction and take appropriate action.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, transactionID, fraudScore, riskLevel)

	err := s.sendHTML(merchantEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch fraud alert email", "merchant", merchantEmail, "error", err)
	} else {
		s.logger.Info("Fraud alert email successfully dispatched", "merchant", merchantEmail)
	}
}

// SendWebhookFailedEmail sends alert when webhook delivery fails
func (s *EmailService) SendWebhookFailedEmail(merchantEmail, webhookID, eventType string, attempts int) {
	if s.cfg.User == "" || s.cfg.Password == "" {
		s.logger.Warn("SMTP not configured. Skipping webhook failed email.", "target", merchantEmail)
		return
	}

	subject := "Webhook Delivery Failed - " + webhookID
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<h2 style="color: #F59E0B;">Webhook Delivery Failed</h2>
			<p>Webhook delivery has failed after %d attempts:</p>
			<p><strong>Webhook ID:</strong> %s</p>
			<p><strong>Event Type:</strong> %s</p>
			<p>Please check your webhook endpoint configuration and ensure it is accessible.</p>
			<br/>
			<p>Best regards,</p>
			<p><strong>The Advanced Pay Team</strong></p>
		</body>
		</html>
	`, attempts, webhookID, eventType)

	err := s.sendHTML(merchantEmail, subject, body)
	if err != nil {
		s.logger.Error("Failed to dispatch webhook failed email", "merchant", merchantEmail, "error", err)
	} else {
		s.logger.Info("Webhook failed email successfully dispatched", "merchant", merchantEmail)
	}
}

func (s *EmailService) sendHTML(to, subject, htmlBody string) error {
	from := s.cfg.User
	auth := smtp.PlainAuth("", from, s.cfg.Password, s.cfg.Host)

	// Format RFC 822 email
	header := make(map[string]string)
	header["From"] = fmt.Sprintf("Advanced Pay <%s>", from)
	header["To"] = to
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = `text/html; charset="UTF-8"`

	message := ""
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)

	// Since Gmail uses STARTTLS, we can just use smtp.SendMail directly as it auto-negotiates STARTTLS.
	// But if TLS is required at connection, dial manually.
	// smtp.SendMail handles STARTTLS automatically.
	err := smtp.SendMail(addr, auth, from, []string{to}, []byte(message))
	if err != nil {
		// Fallback for strict TLS connections
		if strings.Contains(err.Error(), "short response") || strings.Contains(err.Error(), "tls") {
			return s.sendStrictTLS(addr, auth, from, []string{to}, []byte(message))
		}
		return err
	}

	return nil
}

func (s *EmailService) sendStrictTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         s.cfg.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsconfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return err
	}

	if err = client.Auth(auth); err != nil {
		return err
	}

	if err = client.Mail(from); err != nil {
		return err
	}

	for _, k := range to {
		if err = client.Rcpt(k); err != nil {
			return err
		}
	}

	w, err := client.Data()
	if err != nil {
		return err
	}

	_, err = w.Write(msg)
	if err != nil {
		return err
	}

	err = w.Close()
	if err != nil {
		return err
	}

	client.Quit()
	return nil
}
