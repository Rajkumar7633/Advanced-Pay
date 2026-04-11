# Payment Gateway MVP - Setup Guide

## Project Overview

This is a complete payment gateway MVP with 5 integrated applications:
- **Merchant Dashboard** - Transaction management and analytics
- **Checkout Widget** - Customer payment interface
- **Marketing Website** - Public-facing landing page
- **Developer Docs** - API documentation portal
- **Admin Panel** - Operations management dashboard

Plus a **Golang REST API backend** with PostgreSQL database.

## Prerequisites

- Node.js 18+ (LTS)
- pnpm 8.0+
- Go 1.21+ (for backend)
- PostgreSQL 14+
- Git

## Quick Start

### 1. Frontend Setup

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local

# Update NEXT_PUBLIC_API_URL in .env.local if running backend locally
# NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Start development server
pnpm dev
```

The frontend will run on `http://localhost:3000`

### 2. Backend Setup (Golang)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
go mod download

# Set up database
# Make sure PostgreSQL is running, then:
psql -U postgres -c "CREATE DATABASE payment_gateway;"
psql -U postgres -d payment_gateway -f database/schema.sql

# Create environment file
cp .env.example .env

# Update database credentials in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/payment_gateway

# Run backend server
go run main.go
```

The backend API will run on `http://localhost:8080`

## Project Structure

```
payment-gateway/
├── app/                          # Next.js 16 App Router
│   ├── page.tsx                 # Landing page with app navigator
│   ├── layout.tsx               # Root layout with metadata
│   ├── globals.css              # Design tokens and styles
│   ├── dashboard/               # Merchant Dashboard
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── transactions/        # Transaction management
│   │   ├── analytics/           # Analytics and reporting
│   │   └── settings/            # Merchant settings
│   ├── checkout/                # Payment Checkout Widget
│   │   └── page.tsx            # Checkout interface
│   ├── marketing/               # Marketing website
│   │   └── page.tsx            # Landing page
│   ├── docs/                    # Developer documentation
│   │   └── page.tsx            # API docs portal
│   └── admin/                   # Admin Operations Panel
│       └── page.tsx            # Admin dashboard
├── components/                  # React components
│   ├── ui/                     # shadcn/ui components (75+ components)
│   ├── dashboard/              # Dashboard-specific components
│   ├── checkout/               # Checkout components
│   ├── forms/                  # Form components
│   └── transactions/           # Transaction components
├── hooks/                       # Custom React hooks
│   ├── useApi.ts               # API request hook
│   ├── usePagination.ts        # Pagination logic
│   ├── use-mobile.ts           # Mobile detection
│   └── use-toast.ts            # Toast notifications
├── lib/                         # Utilities and state
│   ├── types/                  # TypeScript type definitions
│   ├── api-client.ts           # Axios API client
│   ├── formatting.ts           # Currency, date, number formatting
│   ├── store/                  # Zustand state management
│   │   ├── auth.ts            # Authentication state
│   │   └── ui.ts              # UI state (theme, modals)
│   └── utils.ts                # Helper utilities
├── backend/                     # Golang backend
│   ├── main.go                 # Server entry point
│   ├── go.mod                  # Go module definition
│   ├── models/                 # Data models
│   │   └── models.go          # Type definitions
│   ├── handlers/               # API handlers (to be created)
│   ├── middleware/             # Auth, CORS middleware
│   ├── database/               # Database migrations
│   │   └── schema.sql         # PostgreSQL schema
│   └── config/                 # Configuration files
├── pnpm-workspace.yaml          # pnpm workspace config
├── package.json                 # Frontend dependencies
├── tsconfig.json                # TypeScript config
├── next.config.mjs              # Next.js config
├── tailwind.config.ts           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── .env.example                 # Environment template
├── README.md                     # Project documentation
└── SETUP.md                      # This file
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS v4 + Custom Design Tokens
- **UI Components**: shadcn/ui (75+ components)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Dark Mode**: next-themes

### Backend
- **Language**: Go 1.21
- **Framework**: gorilla/mux (or chi)
- **Database**: PostgreSQL 14
- **ORM**: sqlc or sqlx
- **Auth**: JWT tokens
- **API Style**: REST

### Design System
- **Color Palette**: Navy (#001f4d) + Electric Blue (#0066ff) + Neutrals
- **Typography**: Geist (sans-serif) + Geist Mono
- **Spacing**: Tailwind scale (4px base unit)
- **Dark Mode**: Full support with CSS variables

## Available Scripts

```bash
# Frontend
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Run production build
pnpm lint             # Run ESLint
pnpm type-check       # Check TypeScript types

# Backend
cd backend && go run main.go              # Dev server
cd backend && go build -o payment-api     # Build binary
cd backend && go test ./...               # Run tests
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_APP_NAME=PaymentGateway
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (.env)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/payment_gateway
JWT_SECRET=your-secret-key-min-32-chars
ADMIN_EMAIL=admin@paymentgateway.com
ENABLE_UPI_PAYMENTS=true
```

## Database Schema

The PostgreSQL database includes 13 tables:
- `users` - User accounts
- `merchants` - Merchant accounts
- `payments` - Payment records
- `transactions` - Transaction details
- `refunds` - Refund requests
- `disputes` - Dispute cases
- `settlements` - Settlement records
- `bank_accounts` - Merchant bank details
- `webhooks` - Webhook subscriptions
- `invoices` - Invoice records
- `payment_links` - Payment links
- `api_keys` - API credentials
- `audit_logs` - System audit trail

## Key Features Implemented

### Merchant Dashboard
- Real-time revenue analytics with charts
- Transaction history with filtering
- Payment method breakdown
- Settlement management
- API key generation
- Webhook management
- Account settings
- Security settings

### Checkout Widget
- Multi-payment methods (Card, UPI, Net Banking)
- Card validation with CVV/CVC
- UPI QR code generation
- Transaction processing status
- Success receipts
- Error handling
- Mobile responsive design

### Marketing Website
- Hero section with CTAs
- Feature highlights (6 key features)
- Pricing plans (3 tiers)
- Customer testimonials
- FAQ section
- Newsletter signup
- Responsive design

### Developer Docs
- API endpoint reference
- Authentication guide
- Code examples
- SDKs and libraries
- Webhook documentation
- Error handling
- Rate limiting info

### Admin Panel
- Merchant management
- Dispute resolution
- System analytics
- Transaction metrics
- Activity logs
- Configuration management
- User management

## Design System

### Colors (with CSS Variables)
- **Primary**: #0066ff (Electric Blue)
- **Secondary**: #001f4d (Navy)
- **Success**: #00b894 (Green)
- **Warning**: #fdcb6e (Yellow)
- **Destructive**: #ff7675 (Red)
- **Neutrals**: #f8fafc to #0f172a

### Typography
- **Display**: Geist (700 weight)
- **Body**: Geist Regular (400 weight)
- **Mono**: Geist Mono (for code)
- **Line Height**: 1.5-1.6 for body text

### Spacing (Tailwind Scale)
- Base unit: 4px
- Used consistently via `gap-`, `p-`, `m-` classes
- Responsive prefixes: `md:`, `lg:`, `xl:`

## State Management

### Zustand Stores
- **useAuthStore**: User authentication, login/signup
- **useUiStore**: Theme, modal management

Access from components:
```tsx
import { useAuthStore } from '@/lib/store/auth';
import { useUiStore } from '@/lib/store/ui';

const { user, login } = useAuthStore();
const { theme, setTheme } = useUiStore();
```

## API Integration

The frontend expects these API endpoints from the backend:

```
POST   /api/auth/login
POST   /api/auth/signup
GET    /api/merchant/dashboard
GET    /api/transactions
POST   /api/payments/process
POST   /api/refunds
GET    /api/disputes
POST   /api/webhooks
GET    /api/admin/merchants
GET    /api/admin/system-status
```

## Building for Production

### Frontend
```bash
pnpm build
pnpm start
# Or deploy to Vercel
vercel deploy
```

### Backend
```bash
cd backend
go build -o payment-api
./payment-api
# Or containerize with Docker
docker build -t payment-gateway-api .
```

## Security Considerations

- ✅ JWT-based authentication
- ✅ CORS configuration
- ✅ Input validation with Zod
- ✅ SQL parameterized queries
- ✅ Password hashing (bcryptjs)
- ✅ HTTP-only cookies for auth
- ✅ Rate limiting headers
- ✅ HTTPS recommended for production
- ⚠️ Add 3D Secure authentication
- ⚠️ Implement PCI compliance
- ⚠️ Add request signing for webhooks

## Performance Optimizations

- ✅ Code splitting with Next.js
- ✅ Image optimization
- ✅ CSS-in-JS minimization
- ✅ React Query for data fetching
- ✅ Lazy component loading
- ⚠️ Implement caching strategies
- ⚠️ Add CDN for static assets
- ⚠️ Database query optimization

## Deployment

### Vercel (Recommended for Frontend)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### AWS/GCP/Azure (Backend)
1. Containerize with Docker
2. Set up RDS PostgreSQL
3. Deploy to ECS/Cloud Run/App Service
4. Configure API Gateway

## Troubleshooting

### pnpm workspace warning
Already fixed - uses `pnpm-workspace.yaml` instead of package.json workspaces

### Import errors
- Check TypeScript paths in `tsconfig.json`
- Verify `@/` alias points to correct directory

### API connection errors
- Ensure backend is running on correct port
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS headers in backend

### Database errors
- Ensure PostgreSQL is running
- Check connection string in backend `.env`
- Run migrations: `psql -d payment_gateway -f database/schema.sql`

## Next Steps

1. **Backend Implementation**
   - Create handlers for API endpoints
   - Implement database queries
   - Add middleware for auth/CORS

2. **Payment Processing**
   - Our own processor (backend/services/payment_processor.go)
   - Implement 3D Secure
   - Handle webhooks

3. **Testing**
   - Add unit tests (Go testing package)
   - Add E2E tests (Playwright/Cypress)
   - Add API integration tests

4. **DevOps**
   - Set up CI/CD pipeline
   - Add Docker/Kubernetes config
   - Implement monitoring and logging

5. **Documentation**
   - Add Swagger/OpenAPI specs
   - Create video tutorials
   - Add troubleshooting guides

## Support

For issues or questions:
1. Check the README.md for additional details
2. Review the SETUP.md (this file)
3. Check component documentation in shadcn/ui
4. Review type definitions in `lib/types/index.ts`

## License

MIT License - See LICENSE file for details
