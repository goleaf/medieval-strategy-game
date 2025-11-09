#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${APP_ORIGIN:-http://localhost:3000}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run OWASP ZAP baseline scan." >&2
  echo "Set APP_ORIGIN and run inside an environment with Docker." >&2
  exit 2
fi

echo "Running ZAP Baseline against ${TARGET_URL}..."
docker run --rm -u zap -v "$(pwd)":/zap/wrk:rw -t owasp/zap2docker-stable \
  zap-baseline.py -t "${TARGET_URL}" -r zap-baseline-report.html -x zap-baseline-report.xml || true

echo "Report written to ./zap-baseline-report.html"

