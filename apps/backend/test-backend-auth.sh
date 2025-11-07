#!/bin/bash
set -e

# Validate required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_PUBLISHABLE_KEY" "TEST_AUTH_EMAIL" "TEST_AUTH_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo "❌ Error: Required environment variables are not set:"
  printf '  - %s
' "${MISSING_VARS[@]}"
  echo ""
  echo "Please set the following environment variables:"
  echo "  export SUPABASE_URL=\"your-supabase-url\""
  echo "  export SUPABASE_PUBLISHABLE_KEY=\"your-publishable-key\""
  echo "  export TEST_AUTH_EMAIL=\"your-test-email\""
  echo "  export TEST_AUTH_PASSWORD=\"your-test-password\""
  exit 1
fi

# Check for python3 availability
if ! command -v python3 &> /dev/null; then
  if ! command -v python &> /dev/null; then
    echo "❌ Error: Neither python3 nor python is available in PATH"
    echo "Please install Python to run this script"
    exit 1
  fi
  # Use python as fallback
  PYTHON_CMD="python"
else
  PYTHON_CMD="python3"
fi

echo "🔍 Testing Backend Authentication with JWKS (ES256/RS256)"
echo "=================================================="

# Step 1: Get JWT token from Supabase
echo "📝 Step 1: Getting JWT token from Supabase..."

# Create secure temp file
TEMP_LOGIN_RESPONSE=$(mktemp)
chmod 600 "$TEMP_LOGIN_RESPONSE"
trap 'rm -f "$TEMP_LOGIN_RESPONSE"' EXIT

HTTP_CODE=$(curl -s -w '%{http_code}' -o "$TEMP_LOGIN_RESPONSE" -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_AUTH_EMAIL}\",\"password\":\"${TEST_AUTH_PASSWORD}\"}")

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "❌ Login failed with HTTP status: $HTTP_CODE"
  echo "Response:"
  $PYTHON_CMD -m json.tool < "$TEMP_LOGIN_RESPONSE" 2>/dev/null || cat "$TEMP_LOGIN_RESPONSE"
  exit 1
fi

LOGIN_RESPONSE=$(cat "$TEMP_LOGIN_RESPONSE")

if ! echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | $PYTHON_CMD -m json.tool
  exit 1
fi

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | $PYTHON_CMD -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "✅ Got JWT token"
echo ""

# Step 2: Test production backend
# Usage: Override URL with: export PROD_API_URL="https://your-api.example.com"
PROD_API_URL="${PROD_API_URL:-https://api.tenantflow.app}"
echo "🚀 Step 2: Testing backend (${PROD_API_URL})..."

# Create secure temp file for response
TEMP_PROD_RESPONSE=$(mktemp)
chmod 600 "$TEMP_PROD_RESPONSE"
trap 'rm -f "$TEMP_LOGIN_RESPONSE" "$TEMP_PROD_RESPONSE"' EXIT

HTTP_CODE=$(curl -s -w '%{http_code}' -o "$TEMP_PROD_RESPONSE" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "${PROD_API_URL}/api/v1/properties")

PROD_RESPONSE=$(cat "$TEMP_PROD_RESPONSE")

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "  ❌ Production backend failed with HTTP status: $HTTP_CODE"
  echo "  Response:"
  $PYTHON_CMD -m json.tool < "$TEMP_PROD_RESPONSE" 2>/dev/null || cat "$TEMP_PROD_RESPONSE"
  exit 1
fi

# Single Python call to validate and get property count
VALIDATION_RESULT=$($PYTHON_CMD <<EOF
import sys, json
try:
    data = json.loads('''$PROD_RESPONSE''')
    if 'data' in data:
        prop_count = len(data.get('data', []))
        print(f"SUCCESS|{prop_count}")
    else:
        print("FAILURE|Missing 'data' key")
        print(json.dumps(data, indent=2), file=sys.stderr)
except Exception as e:
    print(f"FAILURE|{str(e)}")
    print('''$PROD_RESPONSE''', file=sys.stderr)
EOF
)

STATUS=$(echo "$VALIDATION_RESULT" | cut -d'|' -f1)
MESSAGE=$(echo "$VALIDATION_RESULT" | cut -d'|' -f2)

if [ "$STATUS" = "SUCCESS" ]; then
  echo "  ✅ Production backend working!"
  echo "  Properties count: $MESSAGE"
else
  echo "  ❌ Production backend validation failed: $MESSAGE"
  exit 1
fi

echo ""
echo "=================================================="
