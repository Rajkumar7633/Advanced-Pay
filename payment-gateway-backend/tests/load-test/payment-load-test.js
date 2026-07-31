import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for detailed analysis
const errorRate = new Rate('errors');
const paymentLatency = new Trend('payment_latency');
const tps = new Trend('transactions_per_second');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 TPS
    { duration: '5m', target: 100 },   // Stay at 100 TPS
    { duration: '2m', target: 500 },   // Ramp up to 500 TPS
    { duration: '5m', target: 500 },   // Stay at 500 TPS
    { duration: '2m', target: 1000 },  // Ramp up to 1000 TPS
    { duration: '5m', target: 1000 },  // Stay at 1000 TPS
    { duration: '2m', target: 5000 },  // Ramp up to 5000 TPS
    { duration: '5m', target: 5000 },  // Stay at 5000 TPS
    { duration: '2m', target: 10000 }, // Ramp up to 10000 TPS (target)
    { duration: '10m', target: 10000 }, // Stay at 10000 TPS (stress test)
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'], // Error rate less than 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test data generators
function generateOrderId() {
  return `ORDER-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now()}`;
}

function generateEmail() {
  return `test-${Math.random().toString(36).substr(2, 8)}@example.com`;
}

function generatePhone() {
  return `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

// Authentication - get JWT token
function authenticate() {
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword123',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, loginParams);
  
  if (loginRes.status === 200) {
    const token = loginRes.json('access_token');
    return token;
  }
  
  return null;
}

// Main payment test
export default function () {
  const token = authenticate();
  if (!token) {
    console.error('Authentication failed');
    return;
  }

  const paymentPayload = JSON.stringify({
    order_id: generateOrderId(),
    amount: Math.floor(Math.random() * 10000) + 100, // Random amount between 100-10000
    currency: 'INR',
    payment_method: ['card', 'upi', 'netbanking', 'wallet'][Math.floor(Math.random() * 4)],
    customer_email: generateEmail(),
    customer_phone: generatePhone(),
    metadata: {
      test_mode: true,
      load_test: true,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/payments`, paymentPayload, params);
  const endTime = Date.now();
  
  const latency = endTime - startTime;
  paymentLatency.add(latency);

  const success = check(res, {
    'status is 201': (r) => r.status === 201,
    'has transaction ID': (r) => r.json('transaction_id') !== undefined,
    'has payment URL': (r) => r.json('payment_url') !== undefined,
  });

  errorRate.add(!success);

  if (!success) {
    console.error(`Payment failed: ${res.status} - ${res.body}`);
  }

  // Small sleep to simulate realistic user behavior
  sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
}

// Setup function - runs once before the test
export function setup() {
  console.log('Starting load test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Target TPS: 10,000`);
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('Load test completed');
}
