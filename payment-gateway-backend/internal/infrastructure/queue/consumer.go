package queue

import "context"

// MessageHandler is the callback function signature for consuming messages.
type MessageHandler func(ctx context.Context, message []byte) error

// Consumer is a minimal interface for subscribing to events.
// Implementations: KafkaConsumer, NoopConsumer.
type Consumer interface {
	Consume(ctx context.Context, topic string, groupID string, handler MessageHandler) error
	Close() error
}
