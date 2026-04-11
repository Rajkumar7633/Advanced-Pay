package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourcompany/payment-gateway/internal/domain/service"
	"github.com/yourcompany/payment-gateway/pkg/logger"
)

type ReportingHandler struct {
	reporting *service.ReportingService
	logger    *logger.Logger
}

func NewReportingHandler(reporting *service.ReportingService, logger *logger.Logger) *ReportingHandler {
	return &ReportingHandler{reporting: reporting, logger: logger}
}

func parsePeriod(c *gin.Context) (time.Time, time.Time) {
	period := c.Query("period")
	days := 7
	switch period {
	case "30d":
		days = 30
	case "90d":
		days = 90
	case "7d", "":
		days = 7
	}

	end := time.Now()
	start := end.AddDate(0, 0, -days)
	return start, end
}

func (h *ReportingHandler) DashboardOverview(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	start, end := parsePeriod(c)

	out, err := h.reporting.GetDashboardOverview(c.Request.Context(), merchantID, start, end)
	if err != nil {
		h.logger.Error("Failed to get dashboard overview", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get dashboard overview"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": out})
}

func (h *ReportingHandler) Analytics(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	start, end := parsePeriod(c)

	out, err := h.reporting.GetAnalytics(c.Request.Context(), merchantID, start, end)
	if err != nil {
		h.logger.Error("Failed to get analytics", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": out})
}
