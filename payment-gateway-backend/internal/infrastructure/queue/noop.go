package queue

import "context"

type NoopProducer struct{}

func NewNoopProducer() *NoopProducer { return &NoopProducer{} }

func (n *NoopProducer) Publish(ctx context.Context, topic string, message interface{}) error {
	_ = ctx
	_ = topic
	_ = message
	return nil
}

func (n *NoopProducer) Close() error { return nil }
