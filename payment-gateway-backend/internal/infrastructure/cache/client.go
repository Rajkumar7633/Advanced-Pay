package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Client interface {
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
	Incr(ctx context.Context, key string) (int64, error)
	Expire(ctx context.Context, key string, ttl time.Duration) error
	Close() error
}

type RedisClient struct {
	client *redis.Client
}

type InMemoryClient struct {
	data map[string]item
}

type item struct {
	value  interface{}
	expiry time.Time
}

func NewRedisClient(addr, password string, db int) (Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := rdb.Ping(ctx).Result(); err != nil {
		// Fallback to in-memory if Redis unavailable
		return NewInMemoryClient(), nil
	}
	return &RedisClient{client: rdb}, nil
}

func NewInMemoryClient() Client {
	return &InMemoryClient{
		data: make(map[string]item),
	}
}

// Redis implementation
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, data, ttl).Err()
}

func (r *RedisClient) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

func (r *RedisClient) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *RedisClient) Exists(ctx context.Context, key string) (bool, error) {
	result, err := r.client.Exists(ctx, key).Result()
	return result > 0, err
}

func (r *RedisClient) Incr(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

func (r *RedisClient) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return r.client.Expire(ctx, key, ttl).Err()
}

func (r *RedisClient) Close() error {
	return r.client.Close()
}

// In-memory implementation
func (m *InMemoryClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	m.data[key] = item{
		value:  value,
		expiry: time.Now().Add(ttl),
	}
	return nil
}

func (m *InMemoryClient) Get(ctx context.Context, key string) (string, error) {
	item, exists := m.data[key]
	if !exists {
		return "", fmt.Errorf("key not found")
	}
	if time.Now().After(item.expiry) {
		delete(m.data, key)
		return "", fmt.Errorf("key expired")
	}
	data, err := json.Marshal(item.value)
	return string(data), err
}

func (m *InMemoryClient) Delete(ctx context.Context, key string) error {
	delete(m.data, key)
	return nil
}

func (m *InMemoryClient) Exists(ctx context.Context, key string) (bool, error) {
	item, exists := m.data[key]
	if !exists {
		return false, nil
	}
	if time.Now().After(item.expiry) {
		delete(m.data, key)
		return false, nil
	}
	return true, nil
}

func (m *InMemoryClient) Incr(ctx context.Context, key string) (int64, error) {
	val, err := m.Get(ctx, key)
	if err != nil {
		// Start from 0 if key doesn't exist
		m.data[key] = item{
			value:  int64(1),
			expiry: time.Now().Add(24 * time.Hour),
		}
		return 1, nil
	}
	// Parse existing value as int64
	var current int64
	if err := json.Unmarshal([]byte(val), &current); err != nil {
		return 0, err
	}
	current++
	m.data[key] = item{
		value:  current,
		expiry: time.Now().Add(24 * time.Hour),
	}
	return current, nil
}

func (m *InMemoryClient) Expire(ctx context.Context, key string, ttl time.Duration) error {
	item, exists := m.data[key]
	if !exists {
		return nil
	}
	item.expiry = time.Now().Add(ttl)
	return nil
}

func (m *InMemoryClient) Close() error {
	// No-op for in-memory
	return nil
}
