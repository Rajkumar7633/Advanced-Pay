package circuitbreaker

import (
	"errors"
	"sync"
	"time"

	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type State string

const (
	StateClosed   State = "CLOSED"
	StateOpen     State = "OPEN"
	StateHalfOpen State = "HALF_OPEN"
)

var ErrCircuitOpen = errors.New("circuit breaker is OPEN")

type CircuitBreaker struct {
	Name            string
	maxFailures     int
	resetTimeout    time.Duration
	
	state           State
	failureCount    int
	lastFailureTime time.Time
	
	logger          *logger.Logger
	mu              sync.Mutex
}

func NewCircuitBreaker(name string, maxFailures int, resetTimeout time.Duration, logger *logger.Logger) *CircuitBreaker {
	return &CircuitBreaker{
		Name:         name,
		maxFailures:  maxFailures,
		resetTimeout: resetTimeout,
		state:        StateClosed,
		logger:       logger,
	}
}

func (cb *CircuitBreaker) Execute(operation func() error) error {
	cb.mu.Lock()
	
	// Check if state is OPEN
	if cb.state == StateOpen {
		// Should we transition to Half-Open?
		if time.Since(cb.lastFailureTime) > cb.resetTimeout {
			cb.logger.Warnw("Circuit Breaker entering HALF-OPEN state", "circuit", cb.Name)
			cb.state = StateHalfOpen
		} else {
			cb.mu.Unlock()
			return ErrCircuitOpen
		}
	}
	
	cb.mu.Unlock()
	
	// Execute the chaotic operation
	err := operation()
	
	cb.mu.Lock()
	defer cb.mu.Unlock()
	
	if err != nil {
		cb.failureCount++
		cb.lastFailureTime = time.Now()
		
		if cb.state == StateHalfOpen || cb.failureCount >= cb.maxFailures {
			if cb.state != StateOpen {
				cb.logger.Error("Circuit Breaker TRIPPED to OPEN state!", "circuit", cb.Name, "failures", cb.failureCount)
				cb.state = StateOpen
			}
		}
		return err
	}
	
	// Operation succeeded
	if cb.state != StateClosed {
		cb.logger.Infow("Circuit Breaker RESET to CLOSED state", "circuit", cb.Name)
		cb.state = StateClosed
	}
	cb.failureCount = 0
	
	return nil
}

func (cb *CircuitBreaker) State() State {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state
}
