// k6 load test for the CRM+ERP API.
//   k6 run perf/k6-load.js --vus 50 --duration 1m
// Smoke/stress the auth + public health endpoints and (with a seeded token) a
// paginated list. Token is optional — generate one via /auth/login and export
// BASE_URL + ACCESS_TOKEN.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests under 400ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

const authHeaders = ACCESS_TOKEN
  ? { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  : {};

export default function () {
  // Public endpoints — always exercisable.
  const health = http.get(`${BASE_URL}/health/live`);
  check(health, { 'live 200': (r) => r.status === 200 });

  if (ACCESS_TOKEN) {
    // Authenticated path: read the current user (covers JWT verification + guard).
    const me = http.get(`${BASE_URL}/auth/me`, authHeaders);
    check(me, { 'me 200': (r) => r.status === 200 });
  }
  sleep(0.1);
}
