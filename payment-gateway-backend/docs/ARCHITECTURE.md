# Architecture Documentation

## System Overview

The Payment Gateway is built using Clean Architecture principles, ensuring:
- Independence from frameworks
- Testability
- Independence from UI
- Independence from database
- Independence from external agencies

## Layer Structure

### 1. Domain Layer (Business Logic)
Location: `internal/domain/`

**Responsibilities:**
- Define business entities (models)
- Define business rules (service)
- Define data contracts (repository interfaces)

**Key Components:**
- `models/`: Core business entities
- `service/`: Business logic implementation
- `repository/`: Data access interfaces

### 2. Infrastructure Layer
Location: `internal/infrastructure/`

**Responsibilities:**
- Implement data access (repository)
- External service integrations
- Technical infrastructure

**Key Components:**
- `database/`: PostgreSQL client
- `cache/`: Redis client
- `queue/`: Kafka producer

### 3. API Layer (Presentation)
Location: `internal/api/`

**Responsibilities:**
- HTTP request handling
- Input validation
- Response formatting
- Middleware chain

**Key Components:**
- `handlers/`: HTTP handlers
- `middleware/`: Request processing

## Data Flow

```
Client Request
    ↓
Middleware (Auth, Rate Limit, CORS, Logging)
    ↓
Handler (Validation, Input Processing)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database / Cache / Queue
```

## Database Design

### Core Tables
1. **merchants**: Merchant accounts
2. **transactions**: Payment transactions
3. **payment_details**: Tokenized payment info
4. **refunds**: Refund records
5. **webhooks**: Webhook configurations
6. **webhook_events**: Webhook delivery queue
7. **settlements**: Settlement batches

### Indexes
- merchant_id + created_at for listing
- status for filtering
- order_id for lookup

## Caching Strategy

**Redis Usage:**
1. Session storage
2. Rate limiting counters
3. Idempotency keys (24h TTL)
4. API key verification cache
5. JWT token blacklist

## Event Driven Architecture

**Kafka Topics:**
1. `transactions`: Payment events
2. `webhooks`: Webhook delivery
3. `fraud-alerts`: Fraud detection
4. `settlements`: Settlement events

## Security Architecture

### Authentication Flow
1. Client sends credentials
2. Server validates against DB
3. Generate JWT tokens (access + refresh)
4. Store refresh token in Redis
5. Return tokens to client

### Authorization
1. Extract JWT from Authorization header
2. Verify signature and expiration
3. Extract merchant_id from claims
4. Attach to request context

### API Key Authentication (Alternative)
1. Extract API key from header
2. Hash and lookup in DB
3. Verify merchant status
4. Attach merchant_id to context

## Scalability

### Horizontal Scaling
- Stateless API servers
- Load balanced requests
- Shared Redis for state
- Kafka for async processing

### Database Scaling
- Read replicas for queries
- Write to primary
- Partitioning by date
- Connection pooling

## Monitoring & Observability

### Metrics (Prometheus)
- Request count
- Response time
- Error rate
- Database connections
- Cache hit rate

### Logging (Zap)
- Structured JSON logs
- Request/response logging
- Error tracking
- Performance metrics

### Tracing
- Request ID propagation
- Distributed tracing ready
- Context-based logging

## Error Handling

### Error Types
1. Validation errors → 400
2. Authentication errors → 401
3. Authorization errors → 403
4. Not found errors → 404
5. Business logic errors → 400
6. Internal errors → 500

### Error Response Format
```json
{
  "error": "descriptive message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Performance Optimization

1. **Database**: Connection pooling, prepared statements
2. **Cache**: Redis for hot data
3. **API**: Response caching, ETags
4. **Queue**: Async processing via Kafka
5. **CDN**: Static asset delivery

## Deployment Strategy

### Blue-Green Deployment
1. Deploy new version (green)
2. Test green environment
3. Switch traffic to green
4. Keep blue for rollback

### Rolling Update
1. Update pods gradually
2. Health check each update
3. Rollback on failure

## Future Enhancements

1. GraphQL API
2. gRPC for internal services
3. Circuit breaker pattern
4. Service mesh (Istio)
5. Multi-region deployment
