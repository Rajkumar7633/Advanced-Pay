# Load Testing with k6

This directory contains load testing scripts to validate the 10,000+ TPS capability of the AdvancePay payment gateway.

## Prerequisites

- Install k6: `brew install k6` (macOS) or visit https://k6.io/docs/getting-started/installation/
- Running API server: `make run` or `go run cmd/api/main.go`
    
## Running Load Tests

### Basic Load Test (100 TPS)
```bash
k6 run tests/load-test/payment-load-test.js
```

### Full Scale Test (10,000 TPS)
```bash
API_URL=http://localhost:8080 API_KEY=your-api-key k6 run tests/load-test/payment-load-test.js
```

### Custom Configuration
```bash
k6 run --vus 100 --duration 10m tests/load-test/payment-load-test.js
```

## Test Scenarios

The load test simulates:
- **Ramp-up phases**: Gradually increasing load from 100 to 10,000 TPS
- **Sustained load**: Maintaining target TPS for extended periods
- **Payment operations**: Create payment requests with various payment methods
- **Realistic patterns**: Random delays between requests (1-3 seconds)

## Metrics Tracked

- **TPS (Transactions Per Second)**: Actual throughput achieved
- **Latency**: Response time percentiles (p50, p95, p99)
- **Error Rate**: Failed request percentage
- **Success Rate**: Successful payment percentage
- **Resource Usage**: Memory, CPU, database connections

## Success Criteria

For 10,000+ TPS capability:
- **p95 latency < 500ms**: 95% of requests complete within 500ms
- **p99 latency < 1000ms**: 99% of requests complete within 1 second
- **Error rate < 1%**: Less than 1% of requests fail
- **Success rate > 99%**: More than 99% of payments succeed

## Troubleshooting

### High Error Rates
- Check database connection pool settings
- Verify Redis cluster connectivity
- Review circuit breaker states in monitoring

### High Latency
- Check database query performance
- Review external provider response times
- Verify network connectivity

### Low TPS
- Check system resource limits
- Review goroutine count
- Verify connection pool exhaustion
