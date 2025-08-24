#!/bin/bash

# ESLint Configuration Validation Script
# Validates ESLint setup across the monorepo

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}🔍 ESLint Configuration Validation${NC}\n"

PASSED=0
FAILED=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2 (not found)"
        ((FAILED++))
    fi
}

# Function to check content
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}  ✓${NC} $3"
        ((PASSED++))
    else
        echo -e "${RED}  ✗${NC} $3"
        ((FAILED++))
    fi
}

echo -e "${BOLD}1. Core Configuration Files${NC}"
check_file "eslint.config.js" "Root ESLint config"
check_file "packages/eslint-config/base.js" "Base config"
check_file "packages/eslint-config/nextjs.js" "Next.js config"
check_file "packages/eslint-config/nestjs.js" "NestJS config"
check_file "apps/frontend/eslint.config.mjs" "Frontend config"
check_file "apps/backend/eslint.config.mjs" "Backend config"

echo -e "\n${BOLD}2. ESLint v9 Flat Config Format${NC}"
echo "Base config:"
check_content "packages/eslint-config/base.js" "export default \[" "Uses flat config"
check_content "packages/eslint-config/base.js" "name:" "Has named configs"
check_content "packages/eslint-config/base.js" "typescript-eslint" "Uses typescript-eslint"

echo -e "\n${BOLD}3. Package Dependencies${NC}"
echo "Frontend:"
if grep -q "@repo/eslint-config" "apps/frontend/package.json" 2>/dev/null; then
    echo -e "${GREEN}  ✓${NC} Uses @repo/eslint-config"
    ((PASSED++))
else
    echo -e "${RED}  ✗${NC} Missing @repo/eslint-config"
    ((FAILED++))
fi

echo "Backend:"
if grep -q "@repo/eslint-config" "apps/backend/package.json" 2>/dev/null; then
    echo -e "${GREEN}  ✓${NC} Uses @repo/eslint-config"
    ((PASSED++))
else
    echo -e "${RED}  ✗${NC} Missing @repo/eslint-config"
    ((FAILED++))
fi

echo -e "\n${BOLD}4. Turbo Pipeline${NC}"
if grep -q '"lint"' "turbo.json" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Lint task configured in turbo.json"
    ((PASSED++))
    
    if grep -q '"cache": false' "turbo.json" 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC} Lint caching disabled"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} Lint caching enabled"
        ((PASSED++))
    fi
else
    echo -e "${RED}✗${NC} No lint task in turbo.json"
    ((FAILED++))
fi

echo -e "\n${BOLD}5. ESLint Version Check${NC}"
ESLINT_VERSION=$(npx eslint --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ "$ESLINT_VERSION" == "9" ]; then
    echo -e "${GREEN}✓${NC} Using ESLint v9"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Not using ESLint v9 (found v$ESLINT_VERSION)"
    ((FAILED++))
fi

echo -e "\n${BOLD}6. Quick Lint Test${NC}"
# Test shared package (usually the cleanest)
if npx eslint packages/shared --format=compact --max-warnings=0 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Shared package lints without errors"
    ((PASSED++))
else
    LINT_OUTPUT=$(npx eslint packages/shared --format=compact 2>&1 || true)
    if echo "$LINT_OUTPUT" | grep -q "error"; then
        ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ error' | head -1)
        echo -e "${RED}✗${NC} Shared package has $ERROR_COUNT"
        ((FAILED++))
    elif echo "$LINT_OUTPUT" | grep -q "warning"; then
        WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ warning' | head -1)
        echo -e "${YELLOW}⚠${NC} Shared package has $WARNING_COUNT"
        ((WARNINGS++))
    fi
fi

# Calculate score
TOTAL=$((PASSED + FAILED + WARNINGS))
if [ $TOTAL -gt 0 ]; then
    SCORE=$((PASSED * 100 / TOTAL))
else
    SCORE=0
fi

echo -e "\n${BOLD}📊 Summary${NC}"
echo "────────────────────────────────────────"
echo -e "Score: $(if [ $SCORE -ge 80 ]; then echo -e "${GREEN}"; elif [ $SCORE -ge 60 ]; then echo -e "${YELLOW}"; else echo -e "${RED}"; fi)${SCORE}%${NC}"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"

echo -e "\n${BOLD}💡 Recommendations${NC}"
if [ $SCORE -ge 80 ]; then
    echo -e "${GREEN}✓${NC} Configuration is healthy and well-aligned"
    echo "  • Consider adding pre-commit hooks"
    echo "  • Monitor performance as codebase grows"
elif [ $SCORE -ge 60 ]; then
    echo -e "${YELLOW}⚠${NC} Configuration needs improvements"
    echo "  • Fix missing dependencies"
    echo "  • Enable Turbo caching for better performance"
else
    echo -e "${RED}✗${NC} Configuration has critical issues"
    echo "  • Ensure all packages use @repo/eslint-config"
    echo "  • Update to ESLint v9 flat config format"
fi

# Create JSON report
cat > eslint-validation-report.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "score": $SCORE,
  "passed": $PASSED,
  "warnings": $WARNINGS,
  "failed": $FAILED,
  "health": "$(if [ $SCORE -ge 80 ]; then echo "healthy"; elif [ $SCORE -ge 60 ]; then echo "moderate"; else echo "critical"; fi)"
}
EOF

echo -e "\n${BLUE}Report saved to eslint-validation-report.json${NC}"

exit $(if [ $FAILED -gt 0 ]; then echo 1; else echo 0; fi)