#!/bin/bash
set -e

echo "🔍 Testing Backend Authentication with HS256"
echo "=================================================="

# Step 1: Get JWT token from Supabase
echo "📝 Step 1: Getting JWT token from Supabase..."
LOGIN_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"rhudson42@yahoo.com","password":"Bandit2025!"}')

if ! echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
  exit 1
fi

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "✅ Got JWT token"
echo ""

# Step 2: Test production backend
echo "🚀 Step 2: Testing PRODUCTION backend (api.tenantflow.app)..."
PROD_RESPONSE=$(curl -s \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://api.tenantflow.app/api/v1/properties")

echo "$PROD_RESPONSE" > /tmp/prod_response.json

if echo "$PROD_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); sys.exit(0 if 'data' in data else 1)" 2>/dev/null; then
  echo "  ✅ Production backend working!"
  PROP_COUNT=$(python3 -c "import json; data=json.load(open('/tmp/prod_response.json')); print(len(data.get('data', [])))")
  echo "  Properties count: $PROP_COUNT"
else
  echo "  ❌ Production backend failed"
  echo "  Response:"
  cat /tmp/prod_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/prod_response.json
fi

echo ""
echo "=================================================="
