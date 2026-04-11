package queue

import "context"

type NoopConsumer struct{}

func NewNoopConsumer() *NoopConsumer {
	return &NoopConsumer{}
}

func (c *NoopConsumer) Consume(ctx context.Context, topic string, groupID string, handler MessageHandler) error {
	// Start an infinite loop that just blocks until context is cancelled
	go func() {
		<-ctx.Done()
	}()
	return nil
}

func (c *NoopConsumer) Close() error {
	return nil
}
