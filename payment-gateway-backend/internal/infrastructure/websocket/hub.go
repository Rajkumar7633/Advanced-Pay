package websocket

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

// PulseMessage defines the data structure sent to dashboards
type PulseMessage struct {
	MerchantID string  `json:"-"`
	Event      string  `json:"event"`
	Amount     float64 `json:"amount"`
	Currency   string  `json:"currency"`
	OrderID    string  `json:"order_id"`
	Timestamp  int64   `json:"timestamp"`
}

// Client represents a single merchant's browser connection
type Client struct {
	Hub        *Hub
	Conn       *websocket.Conn
	Send       chan []byte
	MerchantID string
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients mapped by MerchantID for precise targeted broadcasts
	clients    map[string]map[*Client]bool
	Broadcast  chan PulseMessage
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
	log        *logger.Logger
}

func NewHub(log *logger.Logger) *Hub {
	return &Hub{
		Broadcast:  make(chan PulseMessage, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		clients:    make(map[string]map[*Client]bool),
		log:        log,
	}
}

// Run starts the core socket listener thread
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.clients[client.MerchantID] == nil {
				h.clients[client.MerchantID] = make(map[*Client]bool)
			}
			h.clients[client.MerchantID][client] = true
			h.mu.Unlock()
			h.log.Infow("Merchant Dashboard connected to Pulse Hub", "merchant_id", client.MerchantID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.MerchantID][client]; ok {
				delete(h.clients[client.MerchantID], client)
				close(client.Send)
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			// Send ONLY to the specific merchant's open dashboards
			h.mu.RLock()
			payload, _ := json.Marshal(message)
			
			merchantClients := h.clients[message.MerchantID]
			if merchantClients != nil {
				for client := range merchantClients {
					select {
					case client.Send <- payload:
					default:
						close(client.Send)
						delete(h.clients[message.MerchantID], client)
					}
				}
			}

			// OMNISCIENT GOD-MODE: Clone event to all active Super Admins unconditionally
			adminClients := h.clients["superadmin"]
			if adminClients != nil {
				for client := range adminClients {
					select {
					case client.Send <- payload:
					default:
						close(client.Send)
						delete(h.clients["superadmin"], client)
					}
				}
			}
			
			h.mu.RUnlock()
		}
	}
}

// Pump emits actual bytes to the physical socket tunnel
func (c *Client) Pump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.WriteMessage(websocket.TextMessage, message)
		}
	}
}
