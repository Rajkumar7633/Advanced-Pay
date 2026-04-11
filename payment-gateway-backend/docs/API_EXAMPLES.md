# API Examples

## Complete Payment Flow

### 1. Register Merchant
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Acme Corp",
    "email": "merchant@acme.com",
    "phone": "+919876543210",
    "password": "SecurePass123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@acme.com",
    "password": "SecurePass123"
  }'
```

Save the `access_token` from response.

### 3. Create Payment
```bash
curl -X POST http://localhost:8080/api/v1/payments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER-001",
    "amount": 1500.00,
    "currency": "INR",
    "payment_method": "upi",
    "customer_email": "customer@example.com",
    "customer_phone": "+919999999999"
  }'
```

### 4. Get Payment Status
```bash
curl -X GET http://localhost:8080/api/v1/payments/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. List Transactions
```bash
curl -X GET "http://localhost:8080/api/v1/transactions?status=success&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Refund Payment
```bash
curl -X POST http://localhost:8080/api/v1/payments/TRANSACTION_ID/refund \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.00,
    "reason": "Customer requested"
  }'
```

## Testing with Postman

Import this collection:

```json
{
  "info": {
    "name": "Payment Gateway API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [],
            "url": "{{base_url}}/api/v1/auth/register"
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "url": "{{base_url}}/api/v1/auth/login"
          }
        }
      ]
    }
  ]
}
```
