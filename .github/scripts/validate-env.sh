#!/usr/bin/env bash

# Environment Variables Validation Script
# Checks for required environment variables and validates their format

set -e

echo "🔍 Validating Environment Variables..."
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

# Function to check if variable exists
check_var() {
    local var_name=$1
    local required=$2
    local pattern=$3
    
    if [ -z "${!var_name}" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗ Missing required: $var_name${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ Missing optional: $var_name${NC}"
            ((WARNINGS++))
        fi
        return 1
    else
        if [ -n "$pattern" ]; then
            if [[ ! "${!var_name}" =~ $pattern ]]; then
                echo -e "${RED}✗ Invalid format for $var_name${NC}"
                ((ERRORS++))
                return 1
            fi
        fi
        echo -e "${GREEN}✓ $var_name is set${NC}"
        return 0
        
    fi
}

# Function to check URL format
check_url() {
    local var_name=$1
    local required=$2
    
    if [ -z "${!var_name}" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗ Missing required URL: $var_name${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ Missing optional URL: $var_name${NC}"
            ((WARNINGS++))
        fi
    elif [[ ! "${!var_name}" =~ ^https?:// ]]; then
        echo -e "${RED}✗ Invalid URL format for $var_name${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ $var_name is a valid URL${NC}"
    fi
}

echo -e "\n${YELLOW}Checking Core Variables...${NC}"
check_var "NODE_ENV" "false" "^(development|test|production)$"
check_var "PORT" "false" "^[0-9]+$"

echo -e "\n${YELLOW}Checking Supabase Variables...${NC}"
check_url "NEXT_PUBLIC_SUPABASE_URL" "true"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "true" "^[a-zA-Z0-9._-]+$"
check_var "SUPABASE_SERVICE_ROLE_KEY" "true" "^[a-zA-Z0-9._-]+$"
check_url "SUPABASE_URL" "true"
check_var "SUPABASE_ANON_KEY" "true" "^[a-zA-Z0-9._-]+$"

echo -e "\n${YELLOW}Checking Stripe Variables...${NC}"
check_var "STRIPE_SECRET_KEY" "true" "^(sk_test_|sk_live_)[a-zA-Z0-9]+$"
check_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "true" "^(pk_test_|pk_live_)[a-zA-Z0-9]+$"
check_var "STRIPE_WEBHOOK_SECRET" "false" "^(whsec_)[a-zA-Z0-9]+$"

echo -e "\n${YELLOW}Checking PostHog Variables...${NC}"
check_var "NEXT_PUBLIC_POSTHOG_KEY" "false" "^phc_[a-zA-Z0-9]+$"
check_url "NEXT_PUBLIC_POSTHOG_HOST" "false"

echo -e "\n${YELLOW}Checking Email Variables...${NC}"
check_var "RESEND_API_KEY" "false" "^re_[a-zA-Z0-9]+$"
check_var "EMAIL_FROM_ADDRESS" "false" "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

echo -e "\n${YELLOW}Checking App URLs...${NC}"
check_url "NEXT_PUBLIC_APP_URL" "true"
check_url "NEXT_PUBLIC_API_URL" "true"

echo -e "\n${YELLOW}Checking Railway/Vercel Variables...${NC}"
check_var "RAILWAY_ENVIRONMENT" "false"
check_var "VERCEL_ENV" "false" "^(development|preview|production)$"
check_var "VERCEL_URL" "false"

echo -e "\n${YELLOW}Checking CI/CD Variables...${NC}"
check_var "TURBO_TOKEN" "false"
check_var "TURBO_TEAM" "false"

# Summary
echo -e "\n====================================="
echo "Environment Validation Summary:"
echo "====================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are set!${NC}"
else
    echo -e "${RED}❌ Found $ERRORS error(s) in environment configuration${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s) for optional variables${NC}"
fi

# Exit with error if any required variables are missing
if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}Please set the missing required variables before proceeding.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Environment validation complete!${NC}"