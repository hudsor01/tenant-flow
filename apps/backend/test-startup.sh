#!/bin/bash
export CORS_ORIGINS="https://tenantflow.app"
export NODE_ENV="production"
export DATABASE_URL="postgresql://test"
export DIRECT_URL="postgresql://test"
export JWT_SECRET="SecureTestSecret123!@#SecureTestSecret123!@#"
export SUPABASE_URL="https://test.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="test"
export SUPABASE_JWT_SECRET="SecureTestSecret123!@#SecureTestSecret123!@#"
export SUPABASE_ANON_KEY="test"
export STRIPE_SECRET_KEY="test"
export STRIPE_WEBHOOK_SECRET="test"
export CSRF_SECRET="302146e30ad05b02b718549ed3f4f6039484f785afdd51bd01f63767265ca70d"

echo "Testing startup with CORS_ORIGINS=$CORS_ORIGINS"
timeout 2 node dist/apps/backend/src/main.js 2>&1 | grep -E "(CORS|cors)" | head -10
