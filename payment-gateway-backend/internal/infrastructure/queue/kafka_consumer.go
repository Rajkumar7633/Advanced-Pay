package queue

import (
	"context"
	"fmt"

	"github.com/segmentio/kafka-go"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type KafkaConsumer struct {
	brokers []string
	readers []*kafka.Reader
	logger  *logger.Logger
}

func NewKafkaConsumer(cfg config.KafkaConfig, logger *logger.Logger) (*KafkaConsumer, error) {
	if len(cfg.Brokers) == 0 {
		return nil, fmt.Errorf("no kafka brokers provided")
	}
	
	// Test connection to the first broker to trigger fallback if offline
	conn, err := kafka.DialContext(context.Background(), "tcp", cfg.Brokers[0])
	if err != nil {
		return nil, fmt.Errorf("kafka not available: %w", err)
	}
	conn.Close()

	return &KafkaConsumer{
		brokers: cfg.Brokers,
		readers: make([]*kafka.Reader, 0),
		logger:  logger,
	}, nil
}

func (c *KafkaConsumer) Consume(ctx context.Context, topic string, groupID string, handler MessageHandler) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  c.brokers,
		GroupID:  groupID,
		Topic:    topic,
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
	})

	c.readers = append(c.readers, reader)
	
	// Create a worker pool for handling messages concurrently
	msgChan := make(chan []byte, 5000) // Buffer 5K messages

	// Spawn 20 goroutines to act as concurrent consumers processing messages
	for i := 0; i < 20; i++ {
		go func() {
			for val := range msgChan {
				// We create a fresh context for asynchronous background processing
				bgCtx := context.Background()
				err := handler(bgCtx, val)
				if err != nil {
					c.logger.Error("Failed to handle kafka message", "error", err, "topic", topic)
				}
			}
		}()
	}

	go func() {
		defer close(msgChan)
		for {
			m, err := reader.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return // Context canceled, exit gracefully
				}
				c.logger.Error("Failed to read kafka message", "error", err, "topic", topic)
				continue
			}

			// Push to buffered channel immediately to free up ReadMessage
			select {
			case msgChan <- m.Value:
				// Successfully pushed
			case <-ctx.Done():
				return
			}
		}
	}()

	return nil
}

func (c *KafkaConsumer) Close() error {
	for _, reader := range c.readers {
		if err := reader.Close(); err != nil {
			c.logger.Error("Failed to close kafka reader", "error", err)
			return err
		}
	}
	return nil
}
