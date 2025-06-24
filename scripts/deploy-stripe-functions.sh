#!/bin/bash

# Stripe Edge Functions Deployment Script
# This script deploys all Stripe-related Edge Functions to production

echo "🚀 Starting Stripe Edge Functions deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command was successful
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 successful${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if we're logged in
echo -e "${BLUE}🔐 Checking Supabase CLI authentication...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase CLI${NC}"
    echo -e "${BLUE}🔐 Logging in to Supabase...${NC}"
    supabase login
    check_success "Supabase login"
fi

# Set project reference
PROJECT_REF="bshjmbshupiibfiewpxb"
echo -e "${BLUE}🔗 Linking to production project: ${PROJECT_REF}${NC}"

# Try to link to project (may fail if already linked)
supabase link --project-ref $PROJECT_REF 2>/dev/null || echo -e "${YELLOW}⚠️  Project may already be linked${NC}"

# Deploy each function individually for better error handling
echo -e "${BLUE}📦 Deploying Stripe Edge Functions...${NC}"

# 1. Deploy create-subscription (most critical)
echo -e "${BLUE}📤 Deploying create-subscription...${NC}"
supabase functions deploy create-subscription
check_success "create-subscription deployment"

# 2. Deploy stripe-webhook (handles all Stripe events)
echo -e "${BLUE}📤 Deploying stripe-webhook...${NC}"
supabase functions deploy stripe-webhook
check_success "stripe-webhook deployment"

# 3. Deploy create-portal-session (customer billing portal)
echo -e "${BLUE}📤 Deploying create-portal-session...${NC}"
supabase functions deploy create-portal-session
check_success "create-portal-session deployment"

# 4. Deploy cancel-subscription
echo -e "${BLUE}📤 Deploying cancel-subscription...${NC}"
supabase functions deploy cancel-subscription
check_success "cancel-subscription deployment"

# 5. Deploy create-checkout-session (legacy/backup)
echo -e "${BLUE}📤 Deploying create-checkout-session...${NC}"
supabase functions deploy create-checkout-session
check_success "create-checkout-session deployment"

echo -e "${GREEN}🎉 All Stripe Edge Functions deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Next steps required in Supabase Dashboard:${NC}"
echo -e "${YELLOW}1. Set environment variables for all functions:${NC}"
echo -e "   - STRIPE_SECRET_KEY=sk_live_..."
echo -e "   - STRIPE_WEBHOOK_SECRET=whsec_..."
echo -e "   - STRIPE_STARTER_MONTHLY=price_..."
echo -e "   - STRIPE_STARTER_ANNUAL=price_..."
echo -e "   - STRIPE_GROWTH_MONTHLY=price_..."
echo -e "   - STRIPE_GROWTH_ANNUAL=price_..."
echo -e "   - STRIPE_ENTERPRISE_MONTHLY=price_..."
echo -e "   - STRIPE_ENTERPRISE_ANNUAL=price_..."
echo ""
echo -e "${YELLOW}2. Set up Stripe webhook endpoint:${NC}"
echo -e "   URL: https://${PROJECT_REF}.supabase.co/functions/v1/stripe-webhook"
echo -e "   Events: checkout.session.completed, customer.subscription.*, invoice.payment_*, payment_intent.succeeded"
echo ""
echo -e "${BLUE}🔗 Supabase Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}${NC}"
echo -e "${BLUE}📱 Stripe Dashboard: https://dashboard.stripe.com/webhooks${NC}"