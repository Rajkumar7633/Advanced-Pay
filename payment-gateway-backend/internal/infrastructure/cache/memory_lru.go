package cache

import (
	"sync"
	"time"
)

// cacheItem represents a value with an expiration timestamp
type cacheItem struct {
	Value      string
	Expiration int64
}

// MemoryLRU is a Thread-Safe high-speed L1 cache
type MemoryLRU struct {
	items map[string]cacheItem
	mu    sync.RWMutex
}

var l1Cache *MemoryLRU
var l1Once sync.Once

// GetL1Cache returns a singleton instance of the L1 LRU Cache
func GetL1Cache() *MemoryLRU {
	l1Once.Do(func() {
		l1Cache = &MemoryLRU{
			items: make(map[string]cacheItem),
		}
		// Background janitor to sweep expired items
		go l1Cache.janitor()
	})
	return l1Cache
}

// Set adds an item to the cache
func (c *MemoryLRU) Set(key string, value string, duration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var exp int64 = 0
	if duration > 0 {
		exp = time.Now().Add(duration).UnixNano()
	}

	c.items[key] = cacheItem{
		Value:      value,
		Expiration: exp,
	}
}

// Get retrieves an item from the cache
func (c *MemoryLRU) Get(key string) (string, bool) {
	c.mu.RLock()
	item, ok := c.items[key]
	c.mu.RUnlock()

	if !ok {
		return "", false
	}

	// Check expiration
	if item.Expiration > 0 && time.Now().UnixNano() > item.Expiration {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return "", false
	}

	return item.Value, true
}

func (c *MemoryLRU) janitor() {
	for {
		time.Sleep(1 * time.Minute)
		now := time.Now().UnixNano()
		
		c.mu.Lock()
		for k, v := range c.items {
			if v.Expiration > 0 && now > v.Expiration {
				delete(c.items, k)
			}
		}
		c.mu.Unlock()
	}
}
