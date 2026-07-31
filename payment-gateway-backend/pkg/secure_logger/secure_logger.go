package secure_logger

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/yourcompany/payment-gateway/internal/infrastructure/crypto"
	"go.uber.org/zap"
)

// SecureLogger wraps zap logger with PCI DSS compliant data masking
type SecureLogger struct {
	*zap.SugaredLogger
	encryptionService *crypto.EncryptionService
}

// NewSecureLogger creates a new secure logger with data masking
func NewSecureLogger(baseLogger *zap.Logger, masterKey string) (*SecureLogger, error) {
	encService, err := crypto.NewEncryptionService(masterKey)
	if err != nil {
		return nil, err
	}

	return &SecureLogger{
		SugaredLogger:     baseLogger.Sugar(),
		encryptionService: encService,
	}, nil
}

// maskSensitiveData masks sensitive information according to PCI DSS requirements
func (l *SecureLogger) maskSensitiveData(data string) string {
	// Mask credit card numbers
	cardPattern := regexp.MustCompile(`\b(?:\d[ -]*?){13,16}\b`)
	data = cardPattern.ReplaceAllStringFunc(data, func(match string) string {
		return crypto.MaskCardNumber(strings.ReplaceAll(match, " ", ""))
	})

	// Mask email addresses
	emailPattern := regexp.MustCompile(`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`)
	data = emailPattern.ReplaceAllStringFunc(data, crypto.MaskEmail)

	// Mask phone numbers
	phonePattern := regexp.MustCompile(`\b\d{10,15}\b`)
	data = phonePattern.ReplaceAllStringFunc(data, crypto.MaskPhone)

	// Mask API keys and tokens
	apiKeyPattern := regexp.MustCompile(`\b[A-Za-z0-9]{32,}\b`)
	data = apiKeyPattern.ReplaceAllStringFunc(data, func(match string) string {
		if len(match) > 8 {
			return match[:4] + "****" + match[len(match)-4:]
		}
		return "****"
	})

	// Mask potential passwords
	passwordPatterns := []string{
		`"password":\s*"[^"]*"`,
		`"pwd":\s*"[^"]*"`,
		`"secret":\s*"[^"]*"`,
		`"token":\s*"[^"]*"`,
		`"api_key":\s*"[^"]*"`,
	}

	for _, pattern := range passwordPatterns {
		re := regexp.MustCompile(pattern)
		data = re.ReplaceAllString(data, `"$1":"****"`)
	}

	return data
}

// Infow logs info messages with sensitive data masked
func (l *SecureLogger) Infow(msg string, keysAndValues ...interface{}) {
	maskedValues := make([]interface{}, len(keysAndValues))
	for i, v := range keysAndValues {
		if str, ok := v.(string); ok {
			maskedValues[i] = l.maskSensitiveData(str)
		} else {
			maskedValues[i] = v
		}
	}
	l.SugaredLogger.Infow(msg, maskedValues...)
}

// Errorw logs error messages with sensitive data masked
func (l *SecureLogger) Errorw(msg string, keysAndValues ...interface{}) {
	maskedValues := make([]interface{}, len(keysAndValues))
	for i, v := range keysAndValues {
		if str, ok := v.(string); ok {
			maskedValues[i] = l.maskSensitiveData(str)
		} else {
			maskedValues[i] = v
		}
	}
	l.SugaredLogger.Errorw(msg, maskedValues...)
}

// Warnw logs warning messages with sensitive data masked
func (l *SecureLogger) Warnw(msg string, keysAndValues ...interface{}) {
	maskedValues := make([]interface{}, len(keysAndValues))
	for i, v := range keysAndValues {
		if str, ok := v.(string); ok {
			maskedValues[i] = l.maskSensitiveData(str)
		} else {
			maskedValues[i] = v
		}
	}
	l.SugaredLogger.Warnw(msg, maskedValues...)
}

// Debugw logs debug messages with sensitive data masked
func (l *SecureLogger) Debugw(msg string, keysAndValues ...interface{}) {
	maskedValues := make([]interface{}, len(keysAndValues))
	for i, v := range keysAndValues {
		if str, ok := v.(string); ok {
			maskedValues[i] = l.maskSensitiveData(str)
		} else {
			maskedValues[i] = v
		}
	}
	l.SugaredLogger.Debugw(msg, maskedValues...)
}

// Info logs info messages with sensitive data masked
func (l *SecureLogger) Info(msg string, keysAndValues ...interface{}) {
	l.Infow(msg, keysAndValues...)
}

// Error logs error messages with sensitive data masked
func (l *SecureLogger) Error(msg string, keysAndValues ...interface{}) {
	l.Errorw(msg, keysAndValues...)
}

// Warn logs warning messages with sensitive data masked
func (l *SecureLogger) Warn(msg string, keysAndValues ...interface{}) {
	l.Warnw(msg, keysAndValues...)
}

// Debug logs debug messages with sensitive data masked
func (l *SecureLogger) Debug(msg string, keysAndValues ...interface{}) {
	l.Debugw(msg, keysAndValues...)
}

// Fatal logs fatal messages with sensitive data masked
func (l *SecureLogger) Fatal(msg string, keysAndValues ...interface{}) {
	maskedValues := make([]interface{}, len(keysAndValues))
	for i, v := range keysAndValues {
		if str, ok := v.(string); ok {
			maskedValues[i] = l.maskSensitiveData(str)
		} else {
			maskedValues[i] = v
		}
	}
	l.SugaredLogger.Fatalw(msg, maskedValues...)
}

// With creates a child logger with additional fields
func (l *SecureLogger) With(args ...interface{}) *SecureLogger {
	return &SecureLogger{
		SugaredLogger:     l.SugaredLogger.With(args...),
		encryptionService: l.encryptionService,
	}
}

// Sync flushes any buffered log entries
func (l *SecureLogger) Sync() error {
	return l.SugaredLogger.Sync()
}

// FormatSensitive formats a sensitive value for logging
func FormatSensitive(value interface{}) string {
	switch v := value.(type) {
	case string:
		if isCreditCard(v) {
			return crypto.MaskCardNumber(v)
		}
		if isEmail(v) {
			return crypto.MaskEmail(v)
		}
		if isPhone(v) {
			return crypto.MaskPhone(v)
		}
		if len(v) > 8 && (strings.Contains(strings.ToLower(v), "key") ||
			strings.Contains(strings.ToLower(v), "secret") ||
			strings.Contains(strings.ToLower(v), "token")) {
			return v[:4] + "****" + v[len(v)-4:]
		}
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}

func isCreditCard(s string) bool {
	cleaned := strings.ReplaceAll(s, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	return regexp.MustCompile(`^\d{13,16}$`).MatchString(cleaned)
}

func isEmail(s string) bool {
	return regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$`).MatchString(s)
}

func isPhone(s string) bool {
	return regexp.MustCompile(`^\d{10,15}$`).MatchString(s)
}
