#!/bin/bash
set -e

echo "🔍 JWT Token Diagnostic"
echo "=================================================="
echo "Supabase URL: $SUPABASE_URL"
echo "Test email: rhudson42@yahoo.com"
echo ""

# Login and get JWT token
echo "📝 Attempting login..."
LOGIN_RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"rhudson42@yahoo.com","password":"Bandit2025!"}')

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Login successful"
  echo ""
  
  # Extract access token
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
  
  # Decode JWT header
  echo "🔑 JWT Header:"
  HEADER=$(echo "$ACCESS_TOKEN" | cut -d'.' -f1)
  PADDING_LEN=$((4 - ${#HEADER} % 4))
  if [ $PADDING_LEN -ne 4 ]; then
    HEADER="${HEADER}$(printf '%*s' $PADDING_LEN '' | tr ' ' '=')"
  fi
  echo "$HEADER" | base64 -d 2>/dev/null | python3 -m json.tool
  echo ""
  
  echo "🔑 JWT Token (first 50 chars):"
  echo "  ${ACCESS_TOKEN:0:50}..."
  echo ""
  
  # Decode JWT payload (base64 decode middle part)
  echo "📦 JWT Payload:"
  PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2)
  # Add padding if needed
  PADDING_LEN=$((4 - ${#PAYLOAD} % 4))
  if [ $PADDING_LEN -ne 4 ]; then
    PAYLOAD="${PAYLOAD}$(printf '%*s' $PADDING_LEN '' | tr ' ' '=')"
  fi
  echo "$PAYLOAD" | base64 -d 2>/dev/null | python3 -m json.tool
  echo ""
  
  # Test JWKS endpoint
  echo "🔐 Testing JWKS endpoint..."
  JWKS_URL="${SUPABASE_URL}/auth/v1/.well-known/jwks.json"
  echo "  URL: $JWKS_URL"
  JWKS_RESPONSE=$(curl -s "$JWKS_URL")
  echo "✅ JWKS endpoint accessible"
  echo "$JWKS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'  Algorithm: {data[\"keys\"][0][\"alg\"]}'); print(f'  Key ID: {data[\"keys\"][0][\"kid\"]}')"
  echo ""
  
  # Test backend API
  BACKEND_URL="${API_BASE_URL:-https://api.tenantflow.app}"
  echo "🚀 Testing backend API: ${BACKEND_URL}/api/v1/properties"
  
  API_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    "${BACKEND_URL}/api/v1/properties")
  
  HTTP_CODE=$(echo "$API_RESPONSE" | tail -1)
  RESPONSE_BODY=$(echo "$API_RESPONSE" | head -n -1)
  
  echo "  Response status: $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend API accessible with token"
    echo "$RESPONSE_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'  Properties count: {len(data.get(\"data\", []))}')" 2>/dev/null || echo "  Response: OK"
  else
    echo "❌ Backend API returned error"
    echo "  Error response:"
    echo "$RESPONSE_BODY"
  fi
  
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
  exit 1
fi
