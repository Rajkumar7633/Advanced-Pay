# Backend: 100% Golang, Our Own Payment Gateway

**No Stripe. No Razorpay. No third-party payment processors.**

---

## Architecture

All payment processing is **our own** — built in Golang. When you get RBI Payment Aggregator license, you integrate directly with banks and NPCI.

```
┌─────────────────────┐
│   Frontend (Next.js)│
└──────────┬──────────┘
           │ POST /api/payments
           ▼
┌─────────────────────┐
│  Go Backend (Golang) │
│  handlers/payments.go│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ services/           │
│ payment_processor.go│  ← Our own logic
│ - ProcessCard()     │
│ - ProcessUPI()     │
│ - ProcessNetBanking│
│ - ValidateCard()   │
│ - TokenizeCard()   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostgreSQL          │
│ (Our DB)            │
└─────────────────────┘
```

---

## What's Implemented

### 1. Auth (Golang + PostgreSQL)

- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/signup` — Register merchant
- `POST /api/auth/refresh` — Refresh JWT
- Password hashing: bcrypt
- JWT tokens

### 2. Payment Processing (Our Own)

**File:** `backend/services/payment_processor.go`

- **ProcessCard** — Card validation (Luhn), our own processing
- **ProcessUPI** — VPA validation, our own flow
- **ProcessNetBanking** — Redirect simulation
- **TokenizeCard** — Our token format (tok_xxx)
- **ValidateCard** — Luhn + expiry
- **ValidateUPI** — VPA format

Replace the `// Replace with actual bank API` blocks with your bank/NPCI integration when licensed.

### 3. Database (PostgreSQL)

- `repository/auth_repository.go` — Users
- `repository/merchant_repository.go` — Merchants
- `repository/payment_repository.go` — Payments, Transactions

### 4. Handlers (All Golang)

| Handler    | File             | Purpose                    |
|-----------|------------------|----------------------------|
| Auth      | handlers/auth.go | Login, signup, refresh     |
| Payments  | handlers/payments.go | Create, get, refund    |
| Merchants | handlers/merchants.go | Dashboard, transactions |
| Webhooks  | handlers/webhooks.go | List, create webhooks  |

---

## How to Run

```bash
# 1. Create database
createdb payment_gateway

# 2. Run schema
psql -d payment_gateway -f backend/database/schema.sql

# 3. Seed default merchant
psql -d payment_gateway -f backend/database/seed.sql

# 4. Run backend
cd backend && go run main.go
# Server on http://localhost:8080
```

---

## Production: Bank Integration

When you have RBI license, replace in `payment_processor.go`:

1. **Cards** — Integrate with:
   - NPCI (RuPay)
   - Visa/Mastercard through acquiring bank
   - Or Payment Processor (e.g. payment switch)

2. **UPI** — Integrate with:
   - NPCI UPI API
   - Or through bank's UPI gateway

3. **Net Banking** — Integrate with:
   - Bank's redirect API
   - Or aggregator like BillDesk (only for redirect, not processing)

The structure is ready — swap the simulated logic with real API calls.
