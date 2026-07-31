# AdvancePay Payment Gateway API Documentation

## Overview

The AdvancePay Payment Gateway API provides a comprehensive REST API for processing payments, managing subscriptions, handling webhooks, and more. This documentation covers all available endpoints, authentication, and best practices.

**Base URL**: `https://api.advancepay.com`  
**Sandbox URL**: `https://sandbox.advancepay.com`  
**API Version**: v1

## Authentication

All API requests require authentication using an API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

### Getting Your API Key

1. Log in to your AdvancePay dashboard
2. Navigate to Settings > API Keys
3. Generate a new API key
4. Keep your API key secure and never expose it in client-side code

## Response Format

All API responses follow a consistent JSON format:

### Success Response
```json
{
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Payments

### Create Payment

Create a new payment transaction.

**Endpoint**: `POST /api/v1/payments`

**Request Body**:
```json
{
  "order_id": "order_12345",
  "amount": 100.00,
  "currency": "INR",
  "payment_method": "card",
  "customer_email": "customer@example.com",
  "customer_phone": "+919876543210",
  "customer_name": "John Doe",
  "description": "Payment for order #12345",
  "metadata": {
    "key": "value"
  }
}
```

**Response**:
```json
{
  "data": {
    "transaction_id": "txn_abc123",
    "order_id": "order_12345",
    "amount": 100.00,
    "currency": "INR",
    "status": "pending",
    "payment_url": "https://pay.advancepay.com/txn_abc123",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

### Get Payment

Retrieve payment details by transaction ID.

**Endpoint**: `GET /api/v1/payments/{transaction_id}`

**Response**:
```json
{
  "data": {
    "transaction_id": "txn_abc123",
    "order_id": "order_12345",
    "amount": 100.00,
    "currency": "INR",
    "status": "completed",
    "payment_method": "card",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:05:00Z"
  }
}
```

### List Payments

List all payments with optional filters.

**Endpoint**: `GET /api/v1/payments`

**Query Parameters**:
- `status` (optional): Filter by status (pending, completed, failed, refunded)
- `payment_method` (optional): Filter by payment method
- `start_date` (optional): Start date filter (ISO 8601 format)
- `end_date` (optional): End date filter (ISO 8601 format)
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "transaction_id": "txn_abc123",
      "order_id": "order_12345",
      "amount": 100.00,
      "currency": "INR",
      "status": "completed"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### Capture Payment

Capture a previously authorized payment.

**Endpoint**: `POST /api/v1/transactions/{transaction_id}/capture`

**Response**:
```json
{
  "data": {
    "transaction_id": "txn_abc123",
    "status": "completed",
    "captured_at": "2024-01-01T12:05:00Z"
  }
}
```

### Refund Payment

Process a refund for a payment.

**Endpoint**: `POST /api/v1/refunds`

**Request Body**:
```json
{
  "transaction_id": "txn_abc123",
  "amount": 50.00,
  "reason": "Customer requested refund",
  "idempotency_key": "refund_12345"
}
```

**Response**:
```json
{
  "data": {
    "refund_id": "ref_xyz789",
    "transaction_id": "txn_abc123",
    "amount": 50.00,
    "status": "processed",
    "created_at": "2024-01-01T12:10:00Z"
  }
}
```

## Checkout Sessions

### Create Checkout Session

Create a hosted checkout session for payment collection.

**Endpoint**: `POST /api/v1/checkout/sessions`

**Request Body**:
```json
{
  "order_id": "order_12345",
  "amount": 100.00,
  "currency": "INR",
  "customer_email": "customer@example.com",
  "customer_phone": "+919876543210",
  "customer_name": "John Doe",
  "description": "Payment for order #12345",
  "payment_methods": ["card", "upi", "netbanking"],
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel",
  "expiry_minutes": 30,
  "metadata": {
    "key": "value"
  }
}
```

**Response**:
```json
{
  "data": {
    "session_id": "sess_abc123",
    "order_id": "order_12345",
    "amount": 100.00,
    "currency": "INR",
    "payment_url": "https://pay.advancepay.com/sess_abc123",
    "status": "created",
    "expires_at": "2024-01-01T12:30:00Z"
  }
}
```

### Get Checkout Session

Retrieve checkout session details.

**Endpoint**: `GET /api/v1/checkout/sessions/{session_id}`

**Response**:
```json
{
  "data": {
    "session_id": "sess_abc123",
    "order_id": "order_12345",
    "amount": 100.00,
    "currency": "INR",
    "status": "completed",
    "payment_id": "txn_xyz789"
  }
}
```

### Process Checkout Payment

Process payment from a checkout session.

**Endpoint**: `POST /api/v1/checkout/sessions/{session_id}/process`

**Request Body**:
```json
{
  "payment_method": "card",
  "payment_details": {
    "card_number": "4242424242424242",
    "expiry": "12/25",
    "cvv": "123"
  }
}
```

**Response**:
```json
{
  "data": {
    "payment_id": "txn_xyz789",
    "payment_url": "https://pay.advancepay.com/txn_xyz789",
    "status": "pending",
    "session_status": "processing"
  }
}
```

### Cancel Checkout Session

Cancel a checkout session.

**Endpoint**: `POST /api/v1/checkout/sessions/{session_id}/cancel`

**Response**:
```json
{
  "data": {
    "session_id": "sess_abc123",
    "status": "cancelled"
  }
}
```

### Get Payment Methods

Get list of supported payment methods.

**Endpoint**: `GET /api/v1/checkout/payment-methods`

**Response**:
```json
{
  "data": [
    {
      "id": "card",
      "name": "Credit/Debit Card",
      "display_name": "Card",
      "icon": "credit-card",
      "enabled": true,
      "fields": ["card_number", "expiry", "cvv"]
    },
    {
      "id": "upi",
      "name": "UPI",
      "display_name": "UPI",
      "icon": "smartphone",
      "enabled": true,
      "fields": ["upi_id"]
    }
  ]
}
```

## Subscriptions

### Create Subscription

Create a recurring subscription.

**Endpoint**: `POST /api/v1/subscriptions`

**Request Body**:
```json
{
  "customer_id": "cust_abc123",
  "plan_id": "plan_basic",
  "amount": 100.00,
  "currency": "INR",
  "interval": "monthly",
  "interval_count": 1,
  "trial_period_days": 7,
  "payment_method_id": "pm_xyz789",
  "metadata": {
    "key": "value"
  }
}
```

**Response**:
```json
{
  "data": {
    "subscription_id": "sub_abc123",
    "customer_id": "cust_abc123",
    "plan_id": "plan_basic",
    "amount": 100.00,
    "currency": "INR",
    "status": "active",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z"
  }
}
```

### Get Subscription

Retrieve subscription details.

**Endpoint**: `GET /api/v1/subscriptions/{subscription_id}`

**Response**:
```json
{
  "data": {
    "subscription_id": "sub_abc123",
    "customer_id": "cust_abc123",
    "status": "active",
    "amount": 100.00,
    "currency": "INR",
    "interval": "monthly"
  }
}
```

### Cancel Subscription

Cancel a subscription.

**Endpoint**: `POST /api/v1/subscriptions/{subscription_id}/cancel`

**Request Body**:
```json
{
  "cancel_at_period_end": false
}
```

**Response**:
```json
{
  "data": {
    "subscription_id": "sub_abc123",
    "status": "cancelled",
    "cancelled_at": "2024-01-01T12:00:00Z"
  }
}
```

## Webhooks

### Create Webhook

Create a new webhook endpoint.

**Endpoint**: `POST /api/v1/webhooks`

**Request Body**:
```json
{
  "url": "https://example.com/webhook",
  "events": ["payment.completed", "payment.failed"],
  "secret": "webhook_secret_key",
  "retry_policy": {
    "max_retries": 3,
    "retry_delay": "60s",
    "backoff_strategy": "exponential",
    "timeout": "30s"
  }
}
```

**Response**:
```json
{
  "data": {
    "webhook_id": "wh_abc123",
    "url": "https://example.com/webhook",
    "events": ["payment.completed", "payment.failed"],
    "secret": "webhook_secret_key",
    "active": true,
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

### List Webhooks

List all webhooks for your account.

**Endpoint**: `GET /api/v1/webhooks`

**Response**:
```json
{
  "data": [
    {
      "webhook_id": "wh_abc123",
      "url": "https://example.com/webhook",
      "events": ["payment.completed"],
      "active": true
    }
  ]
}
```

### Delete Webhook

Delete a webhook.

**Endpoint**: `DELETE /api/v1/webhooks/{webhook_id}`

**Response**:
```json
{
  "data": {
    "message": "webhook deleted successfully"
  }
}
```

### Get Webhook Delivery Logs

Get delivery logs for a webhook.

**Endpoint**: `GET /api/v1/webhooks/{webhook_id}/logs`

**Query Parameters**:
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (success, failed, retrying)

**Response**:
```json
{
  "data": [
    {
      "log_id": "log_xyz789",
      "webhook_id": "wh_abc123",
      "event_type": "payment.completed",
      "delivery_status": "success",
      "http_status_code": 200,
      "attempt_number": 1,
      "latency_ms": 125,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

## Payment Links

### Create Payment Link

Create a shareable payment link.

**Endpoint**: `POST /api/v1/payment-links`

**Request Body**:
```json
{
  "title": "Payment for Services",
  "description": "Payment for consulting services",
  "amount": 100.00,
  "currency": "INR",
  "expiry_date": "2024-01-31T23:59:59Z",
  "max_uses": 100,
  "customer_email": "customer@example.com",
  "customer_phone": "+919876543210",
  "metadata": {
    "key": "value"
  }
}
```

**Response**:
```json
{
  "data": {
    "link_id": "link_abc123",
    "title": "Payment for Services",
    "amount": 100.00,
    "currency": "INR",
    "link_url": "https://pay.advancepay.com/link/link_abc123",
    "short_url": "https://advpay.co/link_abc1",
    "status": "active",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

### List Payment Links

List all payment links.

**Endpoint**: `GET /api/v1/payment-links`

**Query Parameters**:
- `status` (optional): Filter by status (active, expired, disabled)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "data": [
    {
      "link_id": "link_abc123",
      "title": "Payment for Services",
      "amount": 100.00,
      "currency": "INR",
      "status": "active",
      "current_uses": 25
    }
  ]
}
```

## Analytics

### Get Real-Time Analytics

Get real-time analytics data.

**Endpoint**: `GET /api/v1/analytics/realtime`

**Query Parameters**:
- `merchant_id` (optional): Filter by merchant ID
- `period` (optional): Time period (1h, 24h, 7d, 30d)

**Response**:
```json
{
  "data": {
    "tps": 1250.5,
    "success_rate": 98.7,
    "failure_rate": 1.3,
    "average_latency_ms": 245.8,
    "p95_latency_ms": 485.2,
    "p99_latency_ms": 890.5,
    "total_revenue": 1250000.50,
    "transaction_count": 50000,
    "payment_methods": {
      "card": {
        "count": 25000,
        "amount": 750000.00,
        "success_rate": 99.2
      }
    },
    "fraud_rate": 0.8,
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Get Payment Method Analytics

Get analytics by payment method.

**Endpoint**: `GET /api/v1/analytics/payment-methods`

**Query Parameters**:
- `merchant_id` (optional): Filter by merchant ID
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)

**Response**:
```json
{
  "data": {
    "card": {
      "count": 25000,
      "amount": 750000.00,
      "success_rate": 99.2
    },
    "upi": {
      "count": 15000,
      "amount": 300000.00,
      "success_rate": 98.5
    }
  }
}
```

## Reports

### Generate Custom Report

Generate a custom report.

**Endpoint**: `POST /api/v1/reports/generate`

**Request Body**:
```json
{
  "report_type": "transaction_summary",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-31T23:59:59Z",
  "group_by": ["date", "payment_method"],
  "filters": {
    "status": "completed"
  },
  "format": "json",
  "include_chart": true
}
```

**Response**:
```json
{
  "data": {
    "report_id": "rpt_abc123",
    "report_type": "transaction_summary",
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "generated_at": "2024-01-01T12:00:00Z",
    "data": {
      "total_transactions": 50000,
      "total_amount": 1250000.00
    }
  }
}
```

### Get Report Templates

Get available report templates.

**Endpoint**: `GET /api/v1/reports/templates`

**Response**:
```json
{
  "data": [
    {
      "id": "transaction_summary",
      "name": "Transaction Summary",
      "description": "Summary of all transactions with key metrics",
      "fields": ["date", "amount", "status", "payment_method"],
      "filters": ["status", "payment_method", "date_range"],
      "group_by": ["date", "payment_method", "status"]
    }
  ]
}
```

## GraphQL API

AdvancePay also provides a GraphQL API for flexible data queries.

**Endpoint**: `POST /graphql`

**Request Body**:
```json
{
  "query": "query { payment(id: \"txn_abc123\") { id amount currency status } }"
}
```

**Response**:
```json
{
  "data": {
    "payment": {
      "id": "txn_abc123",
      "amount": 100.00,
      "currency": "INR",
      "status": "completed"
    }
  }
}
```

## Webhook Events

AdvancePay sends webhook events for the following:

- `payment.created` - A new payment is created
- `payment.completed` - Payment is successfully completed
- `payment.failed` - Payment has failed
- `payment.refunded` - Payment has been refunded
- `refund.created` - A refund is created
- `refund.completed` - Refund is completed
- `subscription.created` - Subscription is created
- `subscription.updated` - Subscription is updated
- `subscription.cancelled` - Subscription is cancelled

### Webhook Signature Verification

Webhooks are signed using HMAC-SHA256. Verify the signature:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)
```

## Rate Limits

API requests are rate limited:

- **Production**: 1000 requests per minute per API key
- **Sandbox**: 100 requests per minute per API key

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_FAILED` | Authentication failed |
| `INVALID_REQUEST` | Invalid request parameters |
| `PAYMENT_FAILED` | Payment processing failed |
| `INSUFFICIENT_FUNDS` | Insufficient funds |
| `CARD_DECLINED` | Card declined |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `SERVER_ERROR` | Internal server error |

## SDKs

Official SDKs are available for:

- **Python**: `pip install advancepay`
- **Node.js**: `npm install advancepay-sdk`
- **Go**: `go get github.com/advancepay/advancepay-go`

## Support

For API support, contact:
- Email: api-support@advancepay.com
- Documentation: https://docs.advancepay.com
- Status Page: https://status.advancepay.com
