/*
  Basic k6 load test for read-heavy endpoints.
  Usage:
    APP_ORIGIN=http://localhost:3000 k6 run scripts/load/basic-k6.js
    K6_VUS=200 K6_DURATION=60s APP_ORIGIN=http://localhost:3000 k6 run scripts/load/basic-k6.js
*/

import http from "k6/http";
import { check, sleep } from "k6";

const origin = __ENV.APP_ORIGIN || "http://localhost:3000";
const vus = Number(__ENV.K6_VUS || 50);
const duration = __ENV.K6_DURATION || "30s";

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ["rate<0.01"], // < 1% errors
    http_req_duration: ["p(95)<300"], // 95% under 300ms
  },
};

export default function () {
  const res1 = http.get(`${origin}/api/stats/world`);
  check(res1, {
    "stats ok": (r) => r.status === 200,
  });

  const res2 = http.get(`${origin}/api/villages`);
  check(res2, {
    "villages ok": (r) => r.status === 200,
  });

  sleep(1);
}

