#!/bin/bash

# Test subscription endpoints with test token

API_URL="http://localhost:3002/api/v1/trpc"
TOKEN="test-token-123"

echo "🚀 Testing Subscription Endpoints"
echo "================================="
echo ""

# Set NODE_ENV for test mode
export NODE_ENV=test

echo "1️⃣ Testing get current subscription..."
curl -s -X GET "$API_URL/subscriptions.current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n2️⃣ Testing get available plans..."
curl -s -X GET "$API_URL/subscriptions.getPlans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n3️⃣ Testing premium features access..."
curl -s -X GET "$API_URL/subscriptions.canAccessPremiumFeatures" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n4️⃣ Testing start free trial..."
curl -s -X POST "$API_URL/subscriptions.startFreeTrial" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"json":{}}' | jq '.'

echo -e "\n5️⃣ Testing create checkout session..."
curl -s -X POST "$API_URL/subscriptions.createCheckoutSession" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "planType": "STARTER",
      "billingInterval": "monthly",
      "collectPaymentMethod": false,
      "successUrl": "http://localhost:5173/billing/success",
      "cancelUrl": "http://localhost:5173/billing",
      "uiMode": "hosted"
    }
  }' | jq '.'

echo -e "\n6️⃣ Testing create portal session..."
curl -s -X POST "$API_URL/subscriptions.createPortalSession" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "returnUrl": "http://localhost:5173/billing"
    }
  }' | jq '.'

echo -e "\n✅ Test completed!"