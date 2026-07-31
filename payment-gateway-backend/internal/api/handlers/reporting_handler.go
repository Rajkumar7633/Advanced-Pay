package handlers

import (
	"context"
	"fmt"
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

// GenerateCustomReport generates a custom report based on user criteria
func (h *ReportingHandler) GenerateCustomReport(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	var req struct {
		ReportType   string                 `json:"report_type" binding:"required"`
		StartDate    string                 `json:"start_date" binding:"required"`
		EndDate      string                 `json:"end_date" binding:"required"`
		GroupBy      []string               `json:"group_by"`
		Filters      map[string]interface{} `json:"filters"`
		Format       string                 `json:"format"` // json, csv, pdf
		IncludeChart bool                   `json:"include_chart"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format"})
		return
	}

	endDate, err := time.Parse(time.RFC3339, req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format"})
		return
	}

	// Generate report based on type
	reportData := h.generateReportData(c.Request.Context(), merchantID, req.ReportType, startDate, endDate, req.GroupBy, req.Filters)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"report_id":    uuid.New().String(),
			"report_type":  req.ReportType,
			"period":       gin.H{"start": req.StartDate, "end": req.EndDate},
			"generated_at": time.Now(),
			"data":         reportData,
		},
	})
}

// GetReportTemplates returns available report templates
func (h *ReportingHandler) GetReportTemplates(c *gin.Context) {
	templates := []map[string]interface{}{
		{
			"id":          "transaction_summary",
			"name":        "Transaction Summary",
			"description": "Summary of all transactions with key metrics",
			"fields":      []string{"date", "amount", "status", "payment_method", "customer_email"},
			"filters":     []string{"status", "payment_method", "date_range"},
			"group_by":    []string{"date", "payment_method", "status"},
		},
		{
			"id":          "revenue_report",
			"name":        "Revenue Report",
			"description": "Revenue breakdown by payment method and time period",
			"fields":      []string{"date", "revenue", "payment_method", "transaction_count"},
			"filters":     []string{"payment_method", "date_range", "amount_range"},
			"group_by":    []string{"date", "payment_method"},
		},
		{
			"id":          "customer_analysis",
			"name":        "Customer Analysis",
			"description": "Customer behavior and spending patterns",
			"fields":      []string{"customer_email", "total_spent", "transaction_count", "avg_order_value"},
			"filters":     []string{"date_range", "spending_range", "transaction_count"},
			"group_by":    []string{"customer_email", "date"},
		},
		{
			"id":          "fraud_report",
			"name":        "Fraud Report",
			"description": "Fraud detection and prevention metrics",
			"fields":      []string{"date", "fraud_score", "risk_level", "blocked_transactions"},
			"filters":     []string{"risk_level", "date_range", "fraud_score_range"},
			"group_by":    []string{"date", "risk_level", "fraud_type"},
		},
		{
			"id":          "settlement_report",
			"name":        "Settlement Report",
			"description": "Settlement and payout details",
			"fields":      []string{"settlement_date", "amount", "status", "bank_account", "payout_method"},
			"filters":     []string{"status", "date_range", "amount_range"},
			"group_by":    []string{"settlement_date", "status"},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data": templates,
	})
}

// ScheduleReport schedules a recurring report
func (h *ReportingHandler) ScheduleReport(c *gin.Context) {
	merchantID, err := uuid.Parse(c.GetString("merchant_id"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid merchant"})
		return
	}

	var req struct {
		ReportType string                 `json:"report_type" binding:"required"`
		Schedule   string                 `json:"schedule" binding:"required"` // daily, weekly, monthly
		Recipients []string               `json:"recipients" binding:"required"`
		StartDate  string                 `json:"start_date" binding:"required"`
		Filters    map[string]interface{} `json:"filters"`
		Format     string                 `json:"format"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	scheduleID := uuid.New()

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"schedule_id": scheduleID.String(),
			"merchant_id": merchantID.String(),
			"report_type": req.ReportType,
			"schedule":    req.Schedule,
			"recipients":  req.Recipients,
			"next_run":    time.Now().Add(24 * time.Hour),
			"created_at":  time.Now(),
		},
	})
}

// ExportReport exports a report in specified format
func (h *ReportingHandler) ExportReport(c *gin.Context) {
	reportID := c.Param("report_id")
	format := c.DefaultQuery("format", "csv")

	// In production, this would generate the actual file
	// For now, return a sample response

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=report_%s.%s", reportID, format))
	c.Header("Content-Type", "text/csv")

	c.String(http.StatusOK, "date,amount,status,payment_method\n2024-01-01,100.00,completed,card\n2024-01-02,50.00,completed,upi")
}

// generateReportData generates report data based on report type
func (h *ReportingHandler) generateReportData(ctx context.Context, merchantID uuid.UUID, reportType string, startDate, endDate time.Time, groupBy []string, filters map[string]interface{}) map[string]interface{} {
	switch reportType {
	case "transaction_summary":
		return map[string]interface{}{
			"total_transactions": 50000,
			"total_amount":       1250000.00,
			"success_rate":       98.7,
			"average_amount":     25.00,
			"by_status": map[string]int64{
				"completed": 49350,
				"failed":    500,
				"pending":   150,
			},
			"by_payment_method": map[string]interface{}{
				"card":       map[string]interface{}{"count": 25000, "amount": 750000.00},
				"upi":        map[string]interface{}{"count": 15000, "amount": 300000.00},
				"netbanking": map[string]interface{}{"count": 5000, "amount": 150000.00},
			},
		}
	case "revenue_report":
		return map[string]interface{}{
			"total_revenue": 1250000.00,
			"revenue_by_method": map[string]float64{
				"card":       750000.00,
				"upi":        300000.00,
				"netbanking": 150000.00,
				"wallet":     35000.00,
				"bnpl":       15000.00,
			},
			"daily_revenue": []map[string]interface{}{
				{"date": startDate.Format("2006-01-02"), "revenue": 180000.00},
				{"date": startDate.Add(24 * time.Hour).Format("2006-01-02"), "revenue": 195000.00},
			},
			"growth_rate": 12.5,
		}
	case "customer_analysis":
		return map[string]interface{}{
			"total_customers":        10000,
			"active_customers":       8500,
			"new_customers":          500,
			"churned_customers":      100,
			"average_lifetime_value": 125.00,
			"top_customers": []map[string]interface{}{
				{"email": "customer1@example.com", "total_spent": 5000.00, "transactions": 200},
				{"email": "customer2@example.com", "total_spent": 3500.00, "transactions": 150},
			},
		}
	case "fraud_report":
		return map[string]interface{}{
			"total_transactions":   50000,
			"fraud_attempts":       400,
			"blocked_transactions": 350,
			"fraud_rate":           0.8,
			"by_risk_level": map[string]int64{
				"low":      45000,
				"medium":   3500,
				"high":     1000,
				"critical": 500,
			},
			"fraud_types": map[string]int64{
				"card_testing":     150,
				"account_takeover": 100,
				"identity_fraud":   80,
			},
		}
	default:
		return map[string]interface{}{
			"message": "Report type not implemented",
		}
	}
}
