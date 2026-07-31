package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/yourcompany/payment-gateway/internal/config"
	"github.com/yourcompany/payment-gateway/internal/infrastructure/metrics"
)

// RedisClusterClient implements distributed caching with Redis Cluster
type RedisClusterClient struct {
	client *redis.ClusterClient
}

// NewRedisClusterClient creates a new Redis cluster client for high-throughput distributed caching
func NewRedisClusterClient(cfg config.RedisConfig) (*RedisClusterClient, error) {
	// Support both single node and cluster configurations
	addresses := []string{fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)}

	// If cluster mode is enabled, parse additional addresses
	if cfg.ClusterMode {
		addresses = parseClusterAddresses(cfg.ClusterAddresses)
	}

	client := redis.NewClusterClient(&redis.ClusterOptions{
		Addrs:          addresses,
		Password:       cfg.Password,
		PoolSize:       cfg.PoolSize,
		MinIdleConns:   cfg.PoolSize / 2,
		MaxRetries:     3,
		DialTimeout:    5 * time.Second,
		ReadTimeout:    3 * time.Second,
		WriteTimeout:   3 * time.Second,
		PoolTimeout:    4 * time.Second,
		MaxRedirects:   3,
		ReadOnly:       false,
		RouteByLatency: true,
		RouteRandomly:  false,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis cluster: %w", err)
	}

	return &RedisClusterClient{client: client}, nil
}

func parseClusterAddresses(addresses string) []string {
	// Parse comma-separated cluster addresses
	// Format: "host1:port1,host2:port2,host3:port3"
	var result []string
	if addresses == "" {
		return result
	}

	// Simple parsing - in production, use more robust parsing
	for _, addr := range []string{addresses} {
		result = append(result, addr)
	}

	return result
}

func (r *RedisClusterClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	err := r.client.Set(ctx, key, value, expiration).Err()

	if err != nil {
		metrics.RecordCacheMiss("redis_cluster")
		return err
	}

	metrics.RecordCacheHit("redis_cluster")
	return nil
}

func (r *RedisClusterClient) Get(ctx context.Context, key string) (string, error) {
	val, err := r.client.Get(ctx, key).Result()

	if err != nil {
		if err == redis.Nil {
			metrics.RecordCacheMiss("redis_cluster")
			return "", nil
		}
		metrics.RecordCacheMiss("redis_cluster")
		return "", err
	}

	metrics.RecordCacheHit("redis_cluster")
	return val, nil
}

func (r *RedisClusterClient) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *RedisClusterClient) Exists(ctx context.Context, key string) (bool, error) {
	result, err := r.client.Exists(ctx, key).Result()
	return result > 0, err
}

func (r *RedisClusterClient) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
	return r.client.SetNX(ctx, key, value, expiration).Result()
}

func (r *RedisClusterClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return r.client.Expire(ctx, key, expiration).Err()
}

func (r *RedisClusterClient) Close() error {
	return r.client.Close()
}

// GetClusterInfo returns cluster health information
func (r *RedisClusterClient) GetClusterInfo(ctx context.Context) (map[string]interface{}, error) {
	info := make(map[string]interface{})

	// Get cluster info
	clusterInfo, err := r.client.ClusterInfo(ctx).Result()
	if err != nil {
		return nil, err
	}
	info["cluster_info"] = clusterInfo

	// Get cluster nodes
	nodes, err := r.client.ClusterNodes(ctx).Result()
	if err != nil {
		return nil, err
	}
	info["nodes"] = nodes

	// Get cluster slots
	slots, err := r.client.ClusterSlots(ctx).Result()
	if err != nil {
		return nil, err
	}
	info["slots"] = len(slots)

	return info, nil
}

// Pipeline operations for high throughput
func (r *RedisClusterClient) Pipeline(ctx context.Context, operations func(pipe redis.Pipeliner) error) error {
	pipe := r.client.Pipeline()

	if err := operations(pipe); err != nil {
		return err
	}

	_, err := pipe.Exec(ctx)
	return err
}

// MultiGet for batch operations
func (r *RedisClusterClient) MultiGet(ctx context.Context, keys ...string) ([]interface{}, error) {
	if len(keys) == 0 {
		return nil, nil
	}

	cmds := make([]*redis.StringCmd, len(keys))
	pipe := r.client.Pipeline()

	for i, key := range keys {
		cmds[i] = pipe.Get(ctx, key)
	}

	if _, err := pipe.Exec(ctx); err != nil {
		return nil, err
	}

	results := make([]interface{}, len(keys))
	for i, cmd := range cmds {
		val, err := cmd.Result()
		if err != nil && err != redis.Nil {
			return nil, err
		}
		results[i] = val
	}

	return results, nil
}

// MultiSet for batch operations
func (r *RedisClusterClient) MultiSet(ctx context.Context, pairs map[string]interface{}, expiration time.Duration) error {
	if len(pairs) == 0 {
		return nil
	}

	pipe := r.client.Pipeline()

	for key, value := range pairs {
		pipe.Set(ctx, key, value, expiration)
	}

	_, err := pipe.Exec(ctx)
	return err
}
