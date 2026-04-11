package queue

import "context"

// Producer is a minimal interface for publishing events.
// Implementations: KafkaProducer, NoopProducer.
type Producer interface {
	Publish(ctx context.Context, topic string, message interface{}) error
	Close() error
}
