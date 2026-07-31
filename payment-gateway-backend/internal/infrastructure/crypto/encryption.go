package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"

	"golang.org/x/crypto/hkdf"
	"golang.org/x/crypto/pbkdf2"
)

var (
	ErrInvalidCiphertext = errors.New("invalid ciphertext")
	ErrInvalidKey        = errors.New("invalid key length")
)

// PCI DSS compliant encryption service using AES-256-GCM
type EncryptionService struct {
	masterKey []byte
}

// NewEncryptionService creates a new encryption service with the given master key
// The master key should be 32 bytes for AES-256
func NewEncryptionService(masterKey string) (*EncryptionService, error) {
	key := sha256.Sum256([]byte(masterKey))
	return &EncryptionService{
		masterKey: key[:],
	}, nil
}

// Encrypt encrypts plaintext using AES-256-GCM
// Returns base64-encoded ciphertext
func (e *EncryptionService) Encrypt(plaintext string) (string, error) {
	if len(e.masterKey) != 32 {
		return "", ErrInvalidKey
	}

	block, err := aes.NewCipher(e.masterKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts base64-encoded ciphertext using AES-256-GCM
func (e *EncryptionService) Decrypt(ciphertext string) (string, error) {
	if len(e.masterKey) != 32 {
		return "", ErrInvalidKey
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	block, err := aes.NewCipher(e.masterKey)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", ErrInvalidCiphertext
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// DeriveKey derives a key from a password using PBKDF2 (PCI DSS compliant)
func DeriveKey(password, salt []byte, iterations int) []byte {
	if iterations < 100000 {
		iterations = 100000 // PCI DSS minimum for PBKDF2
	}
	return pbkdf2.Key(password, salt, iterations, 32, sha256.New)
}

// DeriveKeyHKDF derives a key using HKDF (more modern approach)
func DeriveKeyHKDF(masterKey, salt, info []byte) []byte {
	hkdf := hkdf.New(sha256.New, masterKey, salt, info)
	key := make([]byte, 32)
	if _, err := io.ReadFull(hkdf, key); err != nil {
		return nil
	}
	return key
}

// HashCardNumber hashes a card number for comparison (PCI DSS compliant)
// Returns a hash that can be used for matching but not reversed
func HashCardNumber(cardNumber string) string {
	hash := sha256.Sum256([]byte(cardNumber))
	return base64.StdEncoding.EncodeToString(hash[:])
}

// MaskCardNumber masks a card number showing only last 4 digits
// PCI DSS compliant display format
func MaskCardNumber(cardNumber string) string {
	if len(cardNumber) <= 4 {
		return "****"
	}
	return "****-****-****-" + cardNumber[len(cardNumber)-4:]
}

// MaskEmail masks an email address for logging
func MaskEmail(email string) string {
	if len(email) == 0 {
		return ""
	}
	
	atIndex := len(email)
	for i, c := range email {
		if c == '@' {
			atIndex = i
			break
		}
	}
	
	if atIndex <= 2 {
		return "***@***"
	}
	
	return email[:2] + "***@" + email[atIndex+1:]
}

// MaskPhone masks a phone number showing only last 4 digits
func MaskPhone(phone string) string {
	if len(phone) <= 4 {
		return "****"
	}
	return "*******" + phone[len(phone)-4:]
}

// GenerateSecureKey generates a cryptographically secure random key
func GenerateSecureKey(length int) ([]byte, error) {
	key := make([]byte, length)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, fmt.Errorf("failed to generate secure key: %w", err)
	}
	return key, nil
}

// SecureCompare securely compares two strings in constant time
func SecureCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	
	return result == 0
}
