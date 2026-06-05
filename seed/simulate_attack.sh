#!/bin/bash
# simulate_attack.sh
# Injects the demo credential-stuffing event into SentinelMind.
# Run this after `docker compose up` to trigger the 10-second demo scenario.

curl -s -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "ahmed@targetcorp.com",
    "sourceIp": "185.220.101.47",
    "action": "LOGIN",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "userAgent": "python-requests/2.28.0",
    "loginLatencyMs": 312,
    "country": "RU",
    "hour": 23
  }' | jq .

echo ""
echo "Attack injected. Watch the dashboard at http://localhost:3000"
