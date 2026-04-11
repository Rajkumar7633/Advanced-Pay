# Payment Gateway Master Plan — Requirements Mapping

**Vision:** India's fastest, most intelligent, and developer-friendly payment gateway  
**Target:** 10,000+ TPS, <200ms latency, 99.99% uptime, industry-best success rates

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented / In place |
| 🟡 | Partially done / Scaffolded / UI only |
| ❌ | Not implemented |
| 📋 | Planned (by phase) |

---

# PART 1: UNIQUE FEATURES (India First / World First)

## Tier 1: Core Differentiators

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **AI-Powered Smart Routing™** | ❌ | ML model, 50+ factors, real-time prediction — Backend needed |
| 2 | **Zero-Downtime Payment Switching** | ❌ | Circuit breaker, failover — Phase 2/3 infrastructure |
| 3 | **Voice-Activated Payment Confirmation** | ❌ | Speech recognition, 10+ Indian languages — Phase 3 |
| 4 | **Predictive Fraud Score (PFS)** | ❌ | 0–100 score, explainable AI — ML stack needed |
| 5 | **One-Tap Checkout (OTC) Protocol** | ❌ | Tokenization + biometric — Phase 2 |
| 6 | **Regional Language SDKs** | ❌ | 15+ Indian languages — Phase 2 |
| 7 | **Micro-Transaction Batching** | ❌ | Batch <₹10 transactions — Phase 3 |
| 8 | **Blockchain Transaction Ledger** | ❌ | Hyperledger for audit trail — Phase 3 |
| 9 | **Pay-by-WhatsApp Integration** | ❌ | Full checkout in WhatsApp — Phase 3 |
| 10 | **Auto-Retry Intelligence** | ❌ | ML-based retry strategy — Phase 2 |

## Tier 2: Advanced Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 11 | **Real-Time Success Rate Dashboard** | 🟡 | UI placeholder; live bank-wise data not wired |
| 12 | **Pay Later with Instant Credit Check** | ❌ | NBFC integration, AI scoring — Phase 2/3 |
| 13 | **Split Payment Protocol** | ❌ | Multi-recipient split — Phase 2 |
| 14 | **Conversational Payment Bot** | ❌ | NLP payment flow — Phase 3 |
| 15 | **QR Code Generator with Analytics** | 🟡 | Basic payment links + QR; deep analytics missing |
| 16 | **Subscription Intelligence** | ❌ | Churn prediction — Phase 3 |
| 17 | **Payment Link Builder** | ✅ | Create links, basic analytics in place |
| 18 | **Developer Sandbox with AI Assistant** | ❌ | AI chatbot for integration — Phase 2/3 |
| 19 | **Chargeback Defense AI** | ❌ | Auto evidence generation — Phase 3 |
| 20 | **Carbon-Neutral Payments** | ❌ | Green payments — Phase 3 |

---

# PART 2: EXISTING FEATURES (Table Stakes)

## Payment Methods

| Method | Status | Notes |
|--------|--------|-------|
| Credit/Debit Cards (Visa, MC, RuPay, Amex) | 🟡 | Card form UI; backend processing not implemented |
| UPI (all major apps) | 🟡 | UPI form + QR; backend not wired |
| Net Banking (100+ banks) | 🟡 | UI mention; logic not built |
| Wallets (Paytm, PhonePe, etc.) | ❌ | Not implemented |
| EMI (cardless, credit card) | ❌ | Not implemented |
| BNPL | ❌ | Not implemented |
| International Cards | ❌ | Not implemented |
| NEFT/RTGS/IMPS | ❌ | Not implemented |

## Core Features

| Feature | Status | Notes |
|---------|--------|-------|
| Payment Links | ✅ | Create, list, copy link, QR |
| Subscription/Recurring | ❌ | Not implemented |
| Refunds & Cancellations | 🟡 | Refund button in UI; backend pending |
| Settlement Management | ✅ | Settlements page + schedule |
| Invoice Generation | 🟡 | Types defined; UI not built |
| Hosted Payment Page | ✅ | Checkout page exists |
| Custom Checkout (SDK) | 🟡 | Checkout widget; embeddable SDK missing |
| Webhooks | 🟡 | Config in settings; delivery not implemented |
| Multi-Currency | 🟡 | INR in types; other currencies not supported |
| PCI DSS Compliance | ❌ | Not implemented |
| 3D Secure | ❌ | Not implemented |
| Tokenization | ❌ | Not implemented |
| Merchant Dashboard | ✅ | Overview, transactions, analytics |
| Transaction Reports | ✅ | List, filters, export placeholder |
| Reconciliation | 🟡 | Settlement reports; full recon tool missing |
| API Documentation | ✅ | Docs page with endpoints |
| Test Mode / Sandbox | 🟡 | API keys live/test; sandbox env not deployed |
| RBAC | 🟡 | Role in types; enforcement not wired |
| 2FA for Merchants | ❌ | Not implemented |
| Email/SMS Notifications | ❌ | Not implemented |
| Custom Branding | ❌ | Not implemented |

---

# PART 3: TECH STACK ALIGNMENT

## Backend Architecture

| Component | Master Plan | Current | Gap |
|-----------|-------------|---------|-----|
| Framework | Gin/Echo | gorilla/mux | 🟡 Simpler stack; no Gin |
| API Gateway | Go + Redis + JWT | Go + JWT | Redis missing for rate limit, idempotency |
| Payment Engine | Go + gRPC | — | ❌ Not built |
| Payment Router | Go + ML/ONNX | — | ❌ Not built |
| Tokenization | Go + Vault | — | ❌ Not built |
| Webhook Service | Go + Kafka | — | ❌ Not built |
| Fraud Service | Go + Python ML | — | ❌ Not built |
| Settlement Service | Go + PostgreSQL | Schema only | Handlers not implemented |
| Analytics Service | Go + ClickHouse | — | ❌ Not built |
| Audit Service | Go + Hyperledger | audit_logs table | Blockchain missing |

## Database Layer

| Component | Master Plan | Current | Gap |
|-----------|-------------|---------|-----|
| PostgreSQL | 15+ with partitioning | 14, no partitioning | 🟡 Version + partitioning |
| TimescaleDB | For time-series | ❌ | Not used |
| Redis | Session, rate limit, idempotency | ❌ | Not used |
| Elasticsearch | Transaction search | ❌ | Not used |
| ClickHouse | Analytics | ❌ | Not used |
| Kafka | Event streaming | ❌ | Not used |
| Hyperledger | Audit ledger | ❌ | Not used |

## Frontend Architecture

| Component | Master Plan | Current | Gap |
|-----------|-------------|---------|-----|
| Framework | Next.js 14+ | Next.js 16 | ✅ Aligned |
| UI | Tailwind + shadcn/ui | Tailwind + shadcn/ui | ✅ Aligned |
| State | Zustand/Redux | Zustand | ✅ Aligned |
| Data Fetching | TanStack Query | React Query | ✅ Aligned |
| Charts | Recharts/ECharts | Recharts | ✅ Aligned |
| Forms | RHF + Zod | RHF + Zod | ✅ Aligned |

## SDKs & Mobile

| SDK | Master Plan | Current | Gap |
|-----|-------------|---------|-----|
| Web SDK (TS) | <50KB gzipped | Checkout page only | ❌ Embeddable SDK missing |
| Android (Kotlin) | API 21+ | ❌ | Not built |
| iOS (Swift) | iOS 14+ | ❌ | Not built |
| Server: Go, Node, Python, PHP, Java, Ruby, .NET | Multiple | — | ❌ Not built |

## Infrastructure & DevOps

| Component | Master Plan | Current | Gap |
|-----------|-------------|---------|-----|
| Cloud | AWS | Docs only | Not deployed |
| K8s/EKS | Container orchestration | — | Not deployed |
| Prometheus + Grafana | Metrics | — | Not deployed |
| ELK | Logs | — | Not deployed |
| CI/CD | GitHub Actions | — | Not configured |
| Vault | Secrets | — | Not used |
| WAF/DDoS | Cloudflare | — | Not configured |

---

# PART 4: DATABASE SCHEMA

## Master Plan vs Current Schema

| Master Plan Table | Current | Aligned? |
|-------------------|---------|----------|
| merchants | merchants (user_id, different fields) | 🟡 Structure differs |
| merchant_settings | — | ❌ Missing (fraud_threshold, settlement_cycle, etc.) |
| transactions (partitioned) | transactions (no partition) | 🟡 No partitioning, no fraud_score, routing_decision |
| payment_details | — | ❌ Missing (token, card_last4, encrypted_data) |
| refunds | refunds | ✅ Similar |
| settlements | settlements | ✅ Similar |
| webhook_events | webhook_logs | 🟡 Different model |
| fraud_events | — | ❌ Missing |
| api_logs | — | ❌ Missing |
| rate_limits | — | ❌ Missing (Redis preferred) |

**Current extras:** users, api_keys, payments, bank_accounts, disputes, invoices, payment_links, webhooks, audit_logs

---

# PART 5: SYSTEM ARCHITECTURE

| Layer | Master Plan | Current |
|-------|-------------|---------|
| CDN | CloudFront | Not deployed |
| WAF | Cloudflare | Not deployed |
| Load Balancer | ALB + NGINX | Not deployed |
| API Gateway | Auth, rate limit, idempotency | Auth only |
| Microservices | Payment, Fraud, Webhook, Analytics, etc. | Monolith scaffold |
| Message Bus | Kafka | ❌ |
| Data Layer | PG, Redis, ES, ClickHouse | PG only |

---

# PART 6: PHASE CHECKLIST MAPPING

## Phase 1: MVP (Months 1–4)

### Core Payment Processing

| Item | Status |
|------|--------|
| Create merchant account | 🟡 UI signup; backend not complete |
| Generate API keys | 🟡 Settings page; backend not wired |
| Payment initiation API | ❌ |
| Payment status check API | ❌ |
| Webhook implementation | ❌ |
| Card payment support | 🟡 UI only |
| UPI support | 🟡 UI only |
| Net banking (top 10 banks) | ❌ |
| Basic tokenization | ❌ |
| 3D Secure | ❌ |
| Transaction status tracking | ✅ UI |
| Basic refund | 🟡 UI only |

### Security & Compliance

| Item | Status |
|------|--------|
| PCI DSS Level 1 | ❌ |
| Encryption (at rest/transit) | 🟡 HTTPS; at-rest not specialized |
| API auth (JWT) | ✅ |
| Rate limiting | ❌ |
| Basic fraud (rule-based) | ❌ |
| Input validation | ✅ Zod + backend validation |

### Merchant Dashboard

| Item | Status |
|------|--------|
| Login/Signup | ✅ |
| API key management | ✅ |
| Transaction list | ✅ |
| Transaction details | ✅ |
| Basic analytics | ✅ |
| Settlement reports | ✅ |
| Refund management | 🟡 UI |
| Download reports (CSV) | 🟡 Button only |

### Developer Tools

| Item | Status |
|------|--------|
| API docs (Swagger/OpenAPI) | 🟡 Static docs page |
| Sandbox | ❌ |
| Test cards/UPI | ❌ |
| Web SDK | ❌ |
| Sample code | 🟡 In docs |
| Webhook testing | ❌ |

### Infrastructure

| Item | Status |
|------|--------|
| K8s cluster | ❌ |
| PostgreSQL + replication | 🟡 Schema; replication not set |
| Redis cluster | ❌ |
| Prometheus + Grafana | ❌ |
| ELK | ❌ |
| CI/CD | ❌ |
| SSL | — |
| Load balancer | ❌ |

**Phase 1 readiness:** ~40–50% (frontend and schema in place; backend and infra missing)

---

## Phase 2: Growth (Months 5–8)

| Category | Key Items | Status |
|----------|-----------|--------|
| Unique Features | AI Routing, PFS, One-Tap, Auto-Retry | ❌ |
| Payment Methods | Wallets, EMI, BNPL, Intl cards | ❌ |
| Advanced Features | Subscriptions, split payments, bulk refunds | ❌ |
| Merchant Tools | Advanced analytics, dispute mgmt | 🟡 Basic |
| Mobile SDKs | Android, iOS, RN, Flutter | ❌ |
| Infrastructure | Auto-scaling, sharding, multi-region | ❌ |

---

## Phase 3: Market Leadership (Months 9–12)

| Category | Key Items | Status |
|----------|-----------|--------|
| Revolutionary | Voice, Blockchain, WhatsApp, Carbon | ❌ |
| International | Multi-currency, forex | ❌ |
| Enterprise | White-label, SLA, custom infra | ❌ |
| Compliance | ISO 27001, SOC 2, RBI license | ❌ |

---

# SUMMARY SCORECARD

| Area | Implemented | Partial | Not Done |
|------|-------------|---------|----------|
| **Unique Features (20)** | 1 | 3 | 16 |
| **Payment Methods (8)** | 0 | 3 | 5 |
| **Core Features (22)** | 5 | 12 | 5 |
| **Backend Services (10)** | 1 | 1 | 8 |
| **Database** | Schema | Schema | Redis, ES, etc. |
| **Frontend** | 5 apps | — | SDKs |
| **Infrastructure** | 0 | 0 | All |

**Overall:** Strong frontend and schema baseline; backend, ML, and infra need substantial work to match the master plan.

---

# RECOMMENDED PRIORITY ORDER

1. ~~**Backend payment APIs**~~ — ✅ Built (CreatePayment, RefundPayment)  
2. **Redis** — Rate limit, idempotency, sessions (pending)  
3. **Direct bank/NPCI integration** — Our own processor (no third party)  
4. **Webhook delivery** — Reliable, retries (structure ready)  
5. ~~**Schema alignment**~~ — ✅ Migration `001_master_plan.sql`  
6. ~~**Phase 2 features**~~ — ✅ UI: AI routing, fraud score, One-Tap, auto-retry, voice, blockchain  

---

**INTEGRATIONS_BUILT.md** — Full list of what was built in this integration pass.

*Last updated: After full master plan integration*
