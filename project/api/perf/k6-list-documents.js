// Load test (tuần 15): k6 run -e BASE_URL=http://localhost:8000 -e TOKEN=<set-auth-token> perf/k6-list-documents.js
// Ghi lại: máy, số VU, thời lượng, p50/p95, RPS, error rate vào docs/06-testing-strategy.md
import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: { http_req_duration: ["p(95)<300"], http_req_failed: ["rate<0.01"] },
};

const BASE = __ENV.BASE_URL || "http://localhost:8000";
const headers = { Authorization: `Bearer ${__ENV.TOKEN}` };

export default function () {
  const res = http.get(`${BASE}/api/v1/legal-documents?page=1&page_size=20&sort=-issued_date`, { headers });
  check(res, { "200": (r) => r.status === 200 });
}
