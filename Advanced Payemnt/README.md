# PaymentGateway - Enterprise Payment Processing Platform

A modern, full-stack payment gateway MVP with merchant dashboard, checkout widget, marketing site, API documentation, and admin panel. Built with Next.js 15, TypeScript, Tailwind CSS, and Golang backend.

## Features

### 5 Core Applications

1. **Merchant Dashboard** (`/dashboard`)
   - Real-time transaction monitoring
   - Revenue analytics and insights
   - Settlement management
   - API key generation
   - Team member management
   - Payment links and QR codes

2. **Checkout Widget** (`/checkout`)
   - Multi-payment method support (Cards, UPI, Net Banking, Wallets)
   - Inline, modal, and hosted checkout options
   - Responsive design
   - Real-time payment status
   - Receipt generation

3. **Marketing Website** (`/marketing`)
   - Feature showcases
   - Pricing plans
   - Testimonials
   - SEO optimized
   - Call-to-action sections
   - Security & compliance information

4. **Developer Documentation** (`/docs`)
   - Interactive API reference
   - Code examples (Node.js, Python, Go, Ruby, PHP)
   - Webhook documentation
   - Integration guides
   - SDK links
   - Error reference

5. **Admin Panel** (`/admin`)
   - Merchant management & verification
   - Transaction monitoring
   - Dispute resolution
   - System health metrics
   - Analytics & reporting
   - Configuration management

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **UI Animations**: Framer Motion

### Backend
- **Language**: Golang 1.21+
- **Framework**: Gin/Echo REST API
- **Database**: PostgreSQL with pgx
- **Authentication**: JWT + OAuth2
- **Caching**: Redis (optional)
- **Logging**: Structured logging
- **Deployment**: Docker containers

### Database Schema
Complete PostgreSQL schema with:
- Users & Merchants management
- Payments & Transactions
- Refunds & Disputes
- Settlements & Payouts
- Bank accounts
- Webhooks & Event logs
- Audit trail
- Performance indexes

## Project Structure

```
/vercel/share/v0-project
├── app/
│   ├── page.tsx                 # Main landing page
│   ├── checkout/                # Checkout widget
│   ├── dashboard/               # Merchant dashboard
│   │   ├── page.tsx
│   │   ├── transactions/
│   │   ├── analytics/
│   │   └── settings/
│   ├── marketing/               # Marketing website
│   ├── docs/                    # Developer documentation
│   └── admin/                   # Admin panel
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── dashboard/               # Dashboard components
│   ├── checkout/                # Checkout components
│   ├── transactions/            # Transaction components
│   └── forms/                   # Form components
├── hooks/
│   ├── useApi.ts                # API data fetching
│   ├── usePagination.ts         # Pagination logic
│   └── useAuth.ts               # Authentication
├── lib/
│   ├── api-client.ts            # Axios instance
│   ├── formatting.ts            # Currency, date formatting
│   ├── types/                   # TypeScript types
│   └── store/                   # Zustand stores
├── backend/
│   ├── main.go                  # API entry point
│   ├── go.mod                   # Go dependencies
│   ├── models/                  # Data models
│   ├── database/                # Schema & migrations
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   ├── merchants/
│   │   ├── payments/
│   │   ├── transactions/
│   │   └── ...
│   └── middleware/              # Auth, validation, error handling
├── public/                      # Static assets
├── app/globals.css              # Global styles & design tokens
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── next.config.mjs              # Next.js configuration
└── package.json                 # Dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL (for backend)
- Go 1.21+ (for backend development)

### Frontend Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The application will be available at http://localhost:3000

### Backend Setup

```bash
cd backend

# Install Go dependencies
go mod download

# Run migrations (PostgreSQL required)
psql -U postgres -d payment_db -f database/schema.sql

# Start server
go run main.go
```

The API will be available at http://localhost:8080/api

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_APP_NAME=PaymentGateway
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/payment_db
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
PORT=8080
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new merchant
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/confirm` - Confirm payment
- `POST /api/payments/:id/refund` - Refund payment

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction
- `POST /api/transactions/:id/refund` - Refund transaction

### Merchants
- `GET /api/merchants` - List merchants
- `GET /api/merchants/:id` - Get merchant details
- `PUT /api/merchants/:id` - Update merchant

### Settlements
- `GET /api/settlements` - Settlement schedule
- `GET /api/settlements/history` - Payout history

### Disputes
- `GET /api/disputes` - List disputes
- `POST /api/disputes/:id/evidence` - Submit evidence

## Design System

### Color Palette
- **Primary**: #0066ff (Electric Blue)
- **Secondary**: #001f4d (Deep Navy)
- **Success**: #00b894 (Green)
- **Warning**: #fdcb6e (Yellow)
- **Error**: #ff7675 (Red)
- **Neutral**: Grays (#f8fafc - #0f172a)

### Typography
- **Display**: Geist (from Next.js)
- **Body**: Geist
- **Mono**: Geist Mono

### Components
All UI components are from shadcn/ui with custom theming applied for fintech aesthetic.

## Key Features

### Security
- JWT-based authentication
- HTTPS everywhere
- CSRF protection
- XSS prevention
- SQL injection protection
- Rate limiting
- Secure password hashing (bcrypt)
- PCI DSS compliance ready

### Performance
- Server-side rendering where appropriate
- Image optimization
- Code splitting by route
- Database query optimization
- API response caching
- CDN-ready checkout widget

### Accessibility
- WCAG 2.1 AA compliance
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Color contrast compliance
- Screen reader support

## Deployment

### Vercel Deployment (Frontend)
```bash
vercel deploy
```

### Docker (Backend)
```bash
cd backend
docker build -t payment-gateway .
docker run -p 8080:8080 payment-gateway
```

## Database Migrations

PostgreSQL schema is in `backend/database/schema.sql`

```bash
psql -U postgres -d payment_db -f backend/database/schema.sql
```

## Testing

### Frontend Tests
```bash
pnpm test
```

### Backend Tests
```bash
cd backend
go test ./...
```

## Documentation

- API Documentation: http://localhost:3000/docs
- Integration Guides: http://localhost:3000/docs#integration
- Webhook Setup: http://localhost:3000/docs#webhooks

## Support

For issues and questions:
1. Check the documentation at `/docs`
2. Review the admin panel for system status
3. Check error logs in the backend

## License

MIT License - see LICENSE file for details

## Roadmap

### Phase 8: Integration & Testing
- End-to-end testing
- Payment flow testing
- Security testing
- Load testing

### Phase 9: Deployment & Launch
- CI/CD pipeline setup
- Staging environment
- Production deployment
- Monitoring & logging

## Contributing

This is an MVP project. For production use, ensure:
1. Comprehensive test coverage
2. Security audit
3. Performance optimization
4. Data backup strategy
5. Disaster recovery plan

---

Built with v0 by Vercel
