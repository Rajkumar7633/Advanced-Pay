# Payment Gateway MVP - Architecture Documentation

## System Overview

This is a full-stack payment gateway platform consisting of:

1. **Frontend** - Next.js 16 with React 19.2 (5 applications in one codebase)
2. **Backend** - Golang REST API with PostgreSQL database
3. **Design System** - Unified shadcn/ui + Tailwind CSS with custom design tokens

### Key Stats
- **5 Applications**: All in one monolithic frontend repo
- **75+ UI Components**: From shadcn/ui pre-built
- **9+ Custom Components**: Dashboard, checkout, forms, transactions
- **8+ Custom Hooks**: API calls, pagination, data fetching
- **2 Zustand Stores**: Auth and UI state management
- **13 Database Tables**: Complete payment processing schema
- **Backend Ready**: Complete config, middleware, handler structure

---

## Frontend Architecture (Next.js 16)

### Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main landing page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Design system tokens
│   ├── dashboard/         # Merchant Dashboard
│   │   ├── page.tsx
│   │   ├── transactions/
│   │   ├── analytics/
│   │   └── settings/
│   ├── checkout/          # Payment Widget
│   │   └── page.tsx
│   ├── marketing/         # Marketing Website
│   │   └── page.tsx
│   ├── docs/              # Developer Docs
│   │   └── page.tsx
│   └── admin/             # Admin Panel
│       └── page.tsx
│
├── components/            # Reusable Components
│   ├── ui/               # shadcn/ui Components (75+)
│   ├── dashboard/        # Dashboard Components
│   │   ├── nav.tsx
│   │   └── transaction-detail-modal.tsx
│   ├── checkout/         # Checkout Components
│   │   ├── card-form.tsx
│   │   └── upi-form.tsx
│   ├── forms/            # Form Components
│   │   └── form-field.tsx
│   └── transactions/     # Transaction Components
│       └── transaction-list.tsx
│
├── hooks/                # Custom React Hooks
│   ├── useApi.ts         # API request wrapper
│   ├── usePagination.ts  # Pagination state
│   ├── use-mobile.ts     # Mobile detection
│   └── use-toast.ts      # Toast notifications
│
├── lib/                  # Utilities & State
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces
│   ├── store/
│   │   ├── auth.ts       # Zustand auth store
│   │   └── ui.ts         # Zustand UI store
│   ├── api-client.ts     # Axios instance
│   ├── formatting.ts     # Format utilities
│   └── utils.ts          # Helper functions
│
└── public/               # Static assets
```

### Page Structure

Each application follows the same structure pattern:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/lib/store/auth';

export default function PageName() {
  const { user } = useAuthStore();
  const { data, loading, error, request } = useApi();
  
  useEffect(() => {
    request('GET', '/api/endpoint');
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Page Title</h1>
      {/* Content */}
    </div>
  );
}
```

### Design System

**CSS Variables (app/globals.css)**

```css
:root {
  --primary: #0066ff;
  --secondary: #001f4d;
  --success: #00b894;
  --warning: #fdcb6e;
  --destructive: #ff7675;
  /* ... more colors ... */
}

.dark {
  --primary: #0066ff;
  --background: #0f172a;
  /* ... dark mode colors ... */
}
```

**Using Design Tokens in Components**

```tsx
<Button className="bg-primary text-primary-foreground">
  Primary Button
</Button>

<Card className="bg-card border-border">
  <CardContent className="text-foreground">
    Content
  </CardContent>
</Card>
```

### State Management (Zustand)

**Auth Store** (`lib/store/auth.ts`)
```typescript
const { user, token, login, logout } = useAuthStore();
```

**UI Store** (`lib/store/ui.ts`)
```typescript
const { theme, setTheme, openModal, closeModal } = useUiStore();
```

### Custom Hooks

**useApi** - Simplified API calls with loading/error states
```typescript
const { data, loading, error, request } = useApi();

useEffect(() => {
  request('GET', '/api/transactions');
}, []);
```

**usePagination** - Pagination logic
```typescript
const { page, pageSize, next, previous } = usePagination();
```

### Component Examples

**Form Component**
```tsx
import { FormField } from '@/components/forms/form-field';

<FormField
  label="Email"
  type="email"
  placeholder="you@example.com"
  error={errors.email}
/>
```

**Transaction List Component**
```tsx
import { TransactionList } from '@/components/transactions/transaction-list';

<TransactionList 
  transactions={data}
  onViewDetails={handleViewDetails}
/>
```

---

## Backend Architecture (Golang)

### Project Structure

```
backend/
├── main.go               # Server entry point
├── go.mod               # Go module definition
├── go.sum               # Dependency lock file
├── .env.example         # Environment template
│
├── config/
│   └── config.go        # Configuration management
│
├── models/
│   └── models.go        # Data models
│
├── handlers/            # HTTP Request Handlers
│   ├── auth.go         # Authentication
│   ├── merchants.go    # Merchant management
│   ├── payments.go     # Payment processing
│   ├── transactions.go # Transaction queries
│   ├── refunds.go      # Refund handling
│   ├── disputes.go     # Dispute management
│   ├── settlements.go  # Settlement processing
│   ├── webhooks.go     # Webhook management
│   └── admin.go        # Admin operations
│
├── middleware/
│   └── auth.go         # JWT auth + CORS
│
├── database/
│   ├── schema.sql      # PostgreSQL schema
│   └── migrations.go   # (Optional) Migration runner
│
├── utils/
│   └── response.go     # Response formatting
│
└── services/ (Optional)
    ├── payment.go
    ├── settlement.go
    └── notification.go
```

### API Endpoints

**Authentication**
```
POST   /api/auth/login        - User login
POST   /api/auth/signup       - User registration
POST   /api/auth/refresh      - Refresh JWT token
```

**Merchant Operations**
```
GET    /api/merchant/dashboard    - Overview dashboard
GET    /api/transactions          - List transactions
GET    /api/transactions/{id}     - Get transaction details
POST   /api/payments/process      - Process payment
POST   /api/payments/{id}/refund  - Refund payment
GET    /api/disputes              - List disputes
POST   /api/disputes/{id}/resolve - Resolve dispute
```

**Admin Operations**
```
GET    /api/admin/merchants       - List all merchants
GET    /api/admin/transactions    - View all transactions
GET    /api/admin/system-status   - System health check
GET    /api/admin/analytics       - System analytics
```

### Database Schema

**13 Core Tables**

```sql
-- Authentication & Users
users
├── id (UUID)
├── email (VARCHAR UNIQUE)
├── password_hash (VARCHAR)
├── name (VARCHAR)
├── role (ENUM: admin, merchant, customer)
└── created_at (TIMESTAMP)

-- Merchant Accounts
merchants
├── id (UUID)
├── user_id (FK users)
├── name (VARCHAR)
├── website (VARCHAR)
├── status (ENUM: pending, approved, suspended)
├── balance (DECIMAL)
└── monthly_volume (DECIMAL)

-- Payments & Transactions
payments
├── id (UUID)
├── merchant_id (FK merchants)
├── amount (DECIMAL)
├── currency (VARCHAR)
├── status (ENUM: pending, completed, failed)
├── payment_method (VARCHAR)
└── created_at (TIMESTAMP)

transactions
├── id (UUID)
├── payment_id (FK payments)
├── customer_id (FK users)
├── description (TEXT)
├── metadata (JSONB)
└── timestamp (TIMESTAMP)

-- Refunds & Disputes
refunds
├── id (UUID)
├── payment_id (FK payments)
├── amount (DECIMAL)
├── reason (VARCHAR)
└── status (ENUM: pending, approved, rejected)

disputes
├── id (UUID)
├── payment_id (FK payments)
├── merchant_id (FK merchants)
├── reason (TEXT)
└── status (ENUM: open, resolved, closed)

-- Settlements & Banking
settlements
├── id (UUID)
├── merchant_id (FK merchants)
├── amount (DECIMAL)
├── period_start (DATE)
├── period_end (DATE)
└── status (ENUM: pending, processed, completed)

bank_accounts
├── id (UUID)
├── merchant_id (FK merchants)
├── account_number (VARCHAR)
├── bank_name (VARCHAR)
└── verified (BOOLEAN)

-- Integrations
webhooks
├── id (UUID)
├── merchant_id (FK merchants)
├── url (VARCHAR)
├── events (JSONB)
└── active (BOOLEAN)

invoices
├── id (UUID)
├── merchant_id (FK merchants)
├── payment_id (FK payments)
├── amount (DECIMAL)
└── due_date (DATE)

payment_links
├── id (UUID)
├── merchant_id (FK merchants)
├── amount (DECIMAL)
├── description (TEXT)
└── expires_at (TIMESTAMP)

api_keys
├── id (UUID)
├── merchant_id (FK merchants)
├── key_hash (VARCHAR)
├── last_used (TIMESTAMP)
└── active (BOOLEAN)

-- Audit
audit_logs
├── id (UUID)
├── user_id (FK users)
├── action (VARCHAR)
├── resource (VARCHAR)
├── changes (JSONB)
└── timestamp (TIMESTAMP)
```

### Request/Response Format

**Standard Success Response**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

**Standard Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Paginated Response**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### Middleware

**JWT Authentication Middleware**
- Checks Authorization header
- Validates JWT token
- Extracts user ID and role
- Rejects requests with invalid/expired tokens

**CORS Middleware**
- Allows requests from frontend
- Sets proper headers for browser requests
- Handles preflight OPTIONS requests

**Logging Middleware**
- Logs all incoming requests
- Tracks request duration
- Records response status codes

### Configuration Management

```go
// Load from environment variables
cfg := config.Load()

// Access configuration
cfg.Port              // Server port
cfg.DatabaseURL       // DB connection string
cfg.JWTSecret         // JWT signing secret
cfg.AdminEmail        // Admin email
cfg.Enable3DSecure    // Feature flag
```

---

## Data Flow

### User Login Flow
```
1. Frontend: User submits email/password
   ↓
2. API: POST /api/auth/login
   ↓
3. Backend: Hash password → Query DB → Compare hashes
   ↓
4. Backend: Generate JWT token
   ↓
5. Frontend: Store token → Update auth store
   ↓
6. Frontend: Redirect to dashboard
```

### Payment Processing Flow
```
1. Frontend: User selects payment method
   ↓
2. Frontend: POST /api/payments/process
   ↓
3. Backend: Validate payment data
   ↓
4. Backend: Create transaction record
   ↓
5. Backend: Process payment (Our own gateway - direct bank/NPCI)
   ↓
6. Backend: Update transaction status
   ↓
7. Backend: Trigger webhook if configured
   ↓
8. Frontend: Show success/error message
```

---

## Security Architecture

### Authentication
- JWT tokens with expiration
- Password hashing (bcryptjs)
- HTTP-only cookies (recommended)
- Token refresh mechanism

### Authorization
- Role-based access control (RBAC)
- Merchant can only view own data
- Admin can view all data
- Customer access restricted

### Data Protection
- SQL parameterized queries (prevent injection)
- Input validation with Zod (frontend)
- CORS headers properly configured
- HTTPS recommended for production

### Compliance Considerations
- PCI DSS for payment data
- GDPR for customer data
- AML/KYC for merchant verification
- Audit logging for all operations

---

## Performance Considerations

### Frontend Optimization
- Code splitting via Next.js
- Image optimization (next/image)
- CSS-in-JS minimization
- Component lazy loading
- React Query caching

### Backend Optimization
- Database connection pooling
- Query optimization with indexes
- Pagination for large datasets
- Response compression
- Caching strategies (Redis)

### Scalability
- Stateless backend (can scale horizontally)
- Database replication for HA
- Load balancing with round-robin
- CDN for static assets
- Message queues for async tasks

---

## Deployment Architecture

### Frontend Deployment
```
GitHub → Vercel → CDN → Global Distribution
```

**Steps:**
1. Push to GitHub
2. Vercel auto-deploys
3. Built assets cached on CDN
4. Deploy to global edge network

### Backend Deployment
```
Docker → Container Registry → Orchestration (K8s/ECS/Cloud Run)
```

**Steps:**
1. Build Docker image
2. Push to registry (ECR/GCR/ACR)
3. Deploy to container orchestration
4. Configure health checks
5. Set up auto-scaling

### Database Deployment
```
PostgreSQL RDS/Cloud SQL → Automated Backups → Read Replicas
```

---

## Monitoring & Observability

### Logging
- Application logs (JSON format)
- Access logs (all API requests)
- Error logs (exceptions, stack traces)
- Audit logs (user actions)

### Metrics
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Transaction success rates
- Database query performance
- Memory and CPU usage

### Alerting
- High error rate (>5%)
- High latency (>1s)
- Database unavailable
- Low disk space
- Failed health checks

---

## Development Workflow

### Local Development
```bash
# Frontend
pnpm dev

# Backend
cd backend && go run main.go

# Database
docker run -d postgresql:14
```

### Code Organization Best Practices
- One component per file
- Utilities in `lib/` directory
- Custom hooks in `hooks/` directory
- Types in `lib/types/index.ts`
- Constants in separate files

### Git Workflow
- Feature branches from `main`
- PR reviews required
- CI/CD checks pass
- Merge to `main`
- Auto-deploy to staging/production

---

## Future Enhancements

### Short Term (1-3 months)
- Complete backend API implementation
- Direct bank/NPCI integration (own gateway)
- Database migration tools
- Comprehensive API testing
- Webhook retry mechanism

### Medium Term (3-6 months)
- Real-time notifications (WebSockets)
- Advanced analytics dashboard
- Mobile app (React Native)
- Multi-currency support
- Subscription management

### Long Term (6+ months)
- Marketplace features
- White-label solution
- Advanced fraud detection
- AI-powered analytics
- Blockchain settlement

---

## Support & Documentation

- **README.md** - Project overview and quick start
- **SETUP.md** - Detailed setup instructions
- **ARCHITECTURE.md** - This file (system design)
- **API Documentation** - In `/app/docs`
- **Code Comments** - Inline explanations in functions

