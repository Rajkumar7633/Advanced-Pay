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
