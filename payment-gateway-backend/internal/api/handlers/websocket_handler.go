package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	ws "github.com/yourcompany/payment-gateway/internal/infrastructure/websocket"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type WebsocketHandler struct {
	hub    *ws.Hub
	logger *logger.Logger
}

func NewWebsocketHandler(hub *ws.Hub, log *logger.Logger) *WebsocketHandler {
	return &WebsocketHandler{
		hub:    hub,
		logger: log,
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Danger: bypassing origin check for easy mocking during dev.
	// Production code must secure this to specific merchant dashboard arrays.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Connect implements the GET endpoint that upgrades the HTTP layer
func (h *WebsocketHandler) Connect(c *gin.Context) {
	merchantIDStr, exists := c.Get("merchant_id")
	if !exists {
		// Because generic WS APIs can't send headers easily via browser new WebSocket() constructors
		// we often fetch identity from a URL query ?token_id= instead.
		// For Advanced Pay, we assume JWTAuth middleware already placed "merchant_id"
		merchantIDStr = c.Query("token") // Simplified mock for frontend compatibility without header injection
		if merchantIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized pulse connection"})
			return
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade websocket pulse", "error", err)
		return
	}

	client := &ws.Client{
		Hub:        h.hub,
		Conn:       conn,
		Send:       make(chan []byte, 256),
		MerchantID: merchantIDStr.(string),
	}

	// Lock the client safely into the memory mapped router
	client.Hub.Register <- client

	// We only need an emitter pipe right now, so we block listening on the output pump
	go client.Pump()
}
