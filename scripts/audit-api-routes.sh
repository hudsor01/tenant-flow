#!/bin/bash

# API Route Audit Script
# Detects orphaned fetch calls and ensures all API communication uses standardized apiClient
# Usage: ./scripts/audit-api-routes.sh

set -e

echo "🔍 TenantFlow API Route Audit"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ORPHANED_COUNT=0
WARNINGS_COUNT=0

echo "${BLUE}[1/5] Checking for orphaned fetch() calls...${NC}"
echo ""

# Find fetch calls outside of api-client.ts
FETCH_RESULTS=$(rg "fetch\(" apps/frontend/src --type typescript --type tsx 2>/dev/null \
  | grep -v "api-client.ts" \
  | grep -v "node_modules" \
  | grep -v ".next" \
  | grep -v "createBrowserClient" \
  | grep -v "WebFetch" \
  || true)

if [ -n "$FETCH_RESULTS" ]; then
  echo "${RED}❌ Found orphaned fetch() calls:${NC}"
  echo "$FETCH_RESULTS"
  echo ""
  ORPHANED_COUNT=$((ORPHANED_COUNT + 1))
else
  echo "${GREEN}✅ No orphaned fetch() calls found${NC}"
  echo ""
fi

echo "${BLUE}[2/5] Checking for duplicate endpoint definitions...${NC}"
echo ""

# Check for common endpoints that might be duplicated
ENDPOINTS=("api/v1/properties" "api/v1/tenants" "api/v1/units" "api/v1/leases" "api/v1/maintenance")

for endpoint in "${ENDPOINTS[@]}"; do
  COUNT=$(rg "$endpoint" apps/frontend/src --type typescript --type tsx 2>/dev/null | wc -l | tr -d ' ')

  if [ "$COUNT" -gt 10 ]; then
    echo "${YELLOW}⚠️  Endpoint '$endpoint' appears $COUNT times (might be duplicated)${NC}"
    WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
  fi
done

if [ "$WARNINGS_COUNT" -eq 0 ]; then
  echo "${GREEN}✅ No suspicious endpoint duplications${NC}"
fi
echo ""

echo "${BLUE}[3/5] Verifying api-client.ts structure...${NC}"
echo ""

# Check that api-client.ts exports expected resources
REQUIRED_EXPORTS=("propertiesApi" "tenantsApi" "unitsApi" "leasesApi" "maintenanceApi" "createServerApi")

for export in "${REQUIRED_EXPORTS[@]}"; do
  if rg -q "export const $export" apps/frontend/src/lib/api-client.ts 2>/dev/null; then
    echo "${GREEN}✅ Found export: $export${NC}"
  else
    echo "${RED}❌ Missing export: $export${NC}"
    ORPHANED_COUNT=$((ORPHANED_COUNT + 1))
  fi
done
echo ""

echo "${BLUE}[4/5] Checking TanStack Query hooks...${NC}"
echo ""

# Verify hooks use standardized API
HOOKS_DIR="apps/frontend/src/hooks/api"
if [ -d "$HOOKS_DIR" ]; then
  HOOK_FILES=$(find "$HOOKS_DIR" -name "*.ts" -o -name "*.tsx" 2>/dev/null || true)

  for hook_file in $HOOK_FILES; do
    if rg -q "from '@/lib/api-client'" "$hook_file" 2>/dev/null; then
      echo "${GREEN}✅ $hook_file uses api-client${NC}"
    else
      echo "${YELLOW}⚠️  $hook_file doesn't import from api-client${NC}"
      WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
    fi
  done
else
  echo "${YELLOW}⚠️  Hooks directory not found: $HOOKS_DIR${NC}"
fi
echo ""

echo "${BLUE}[5/5] Verifying Server Components use createServerApi...${NC}"
echo ""

# Find Server Components that should use createServerApi
SERVER_PAGES=$(find apps/frontend/src/app -name "page.tsx" -type f 2>/dev/null | grep -v ".client.tsx" || true)

for page in $SERVER_PAGES; do
  # Skip if it's a client component
  if head -n 5 "$page" | grep -q "'use client'" 2>/dev/null; then
    continue
  fi

  # Check if it imports createServerApi
  if grep -q "createServerApi" "$page" 2>/dev/null; then
    echo "${GREEN}✅ $page uses createServerApi${NC}"
  else
    # Check if it fetches data at all (might be static page)
    if grep -q "await.*Api\|async function.*Page" "$page" 2>/dev/null; then
      echo "${YELLOW}⚠️  $page might need createServerApi${NC}"
      WARNINGS_COUNT=$((WARNINGS_COUNT + 1))
    fi
  fi
done
echo ""

# Summary
echo "=============================="
echo "${BLUE}📊 Audit Summary${NC}"
echo "=============================="
echo ""

if [ "$ORPHANED_COUNT" -eq 0 ] && [ "$WARNINGS_COUNT" -eq 0 ]; then
  echo "${GREEN}✅ All checks passed! API architecture is clean.${NC}"
  exit 0
elif [ "$ORPHANED_COUNT" -eq 0 ]; then
  echo "${YELLOW}⚠️  $WARNINGS_COUNT warnings found (review recommended)${NC}"
  exit 0
else
  echo "${RED}❌ $ORPHANED_COUNT critical issues found${NC}"
  echo "${YELLOW}⚠️  $WARNINGS_COUNT warnings found${NC}"
  echo ""
  echo "Please fix critical issues before deploying."
  echo "See apps/frontend/API_PATTERNS.md for guidance."
  exit 1
fi
