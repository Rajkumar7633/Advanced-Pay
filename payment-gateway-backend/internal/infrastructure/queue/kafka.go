package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
	"github.com/yourcompany/payment-gateway/internal/config"
)

type KafkaProducer struct {
	writer *kafka.Writer
}

func NewKafkaProducer(cfg config.KafkaConfig) (*KafkaProducer, error) {
	if len(cfg.Brokers) == 0 {
		return nil, fmt.Errorf("no kafka brokers provided")
	}

	// Test connection to the first broker to trigger fallback if offline
	conn, err := kafka.DialContext(context.Background(), "tcp", cfg.Brokers[0])
	if err != nil {
		return nil, fmt.Errorf("kafka not available: %w", err)
	}
	conn.Close()

	writer := &kafka.Writer{
		Addr:         kafka.TCP(cfg.Brokers...),
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireOne,
	}

	return &KafkaProducer{writer: writer}, nil
}

func (p *KafkaProducer) Publish(ctx context.Context, topic string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return p.writer.WriteMessages(ctx, kafka.Message{
		Topic: topic,
		Value: data,
	})
}

func (p *KafkaProducer) Close() error {
	return p.writer.Close()
}
