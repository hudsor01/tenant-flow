#!/bin/bash
set -e

echo "🔍 Testing LOCAL Backend Authentication with HS256"
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

# Step 2: Test local backend with verbose output
echo "🚀 Step 2: Testing LOCAL backend (localhost:4600)..."
echo "  Sending request with Authorization header..."

curl -v \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "http://localhost:4600/api/v1/properties" 2>&1 | tee /tmp/curl_output.txt

echo ""
echo "=================================================="
