package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

var vaultKey []byte

// InitVault generates or loads the heavy AES-256 Symmetric Key 
func InitVault() {
	key := os.Getenv("VAULT_SECURITY_KEY")
	if key == "" {
		// Fallback for local sandbox, NEVER use in production
		key = "ADVANCEDPAY-32-BYTE-VAULT-KEY-XX"
	}
	vaultKey = []byte(key)
}

// Encrypt locks the raw PAN memory into AES-GCM
func Encrypt(plaintext string) (string, error) {
	if len(vaultKey) == 0 {
		InitVault()
	}

	block, err := aes.NewCipher(vaultKey)
	if err != nil {
		return "", err
	}

	// GCM is heavily recommended for modern cryptographic standards
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt opens the ciphertext at runtime instantly 
func Decrypt(encryptedString string) (string, error) {
	if len(vaultKey) == 0 {
		InitVault()
	}

	enc, _ := base64.StdEncoding.DecodeString(encryptedString)
	if len(enc) == 0 {
		return "", errors.New("empty ciphertext")
	}

	block, err := aes.NewCipher(vaultKey)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(enc) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := enc[:nonceSize], enc[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
