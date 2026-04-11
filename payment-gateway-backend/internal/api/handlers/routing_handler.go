package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
)

type RoutingHandler struct {
	routingService *service.RoutingService
}

func NewRoutingHandler(routingService *service.RoutingService) *RoutingHandler {
	return &RoutingHandler{routingService: routingService}
}

func (h *RoutingHandler) GetDecision(c *gin.Context) {
	amountStr := c.Query("amount")
	method := c.Query("method")
	amount, _ := strconv.ParseFloat(amountStr, 64)

	isRecurring := c.Query("is_recurring") == "true"
	decision := h.routingService.Decide(amount, method, isRecurring)

	c.JSON(http.StatusOK, gin.H{
		"data": decision,})
}
