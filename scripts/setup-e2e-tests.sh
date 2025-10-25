#!/bin/bash
set -e

# E2E Test Setup Script
# Automates the setup process for E2E CRUD tests

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 TenantFlow - E2E Test Setup${NC}\n"

# Step 1: Check .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo -e "Creating .env.local with E2E test credentials template...\n"

    cat > .env.local << 'EOF'
# E2E Test Credentials
# IMPORTANT: Replace these with your actual test user credentials
E2E_OWNER_EMAIL=test-owner@tenantflow.app
E2E_OWNER_PASSWORD=CHANGE_THIS_PASSWORD

# Optional: Tenant user
E2E_TENANT_EMAIL=test-tenant@tenantflow.app
E2E_TENANT_PASSWORD=CHANGE_THIS_PASSWORD

# Optional: Admin user
E2E_ADMIN_EMAIL=test-admin@tenantflow.app
E2E_ADMIN_PASSWORD=CHANGE_THIS_PASSWORD
EOF

    echo -e "${GREEN}✓${NC} Created .env.local"
    echo -e "${YELLOW}⚠️  NEXT STEP: Edit .env.local and set real passwords${NC}\n"
    echo -e "   Then run this script again.\n"
    exit 0
fi

echo -e "${GREEN}✓${NC} Found .env.local\n"

# Step 2: Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Step 3: Check credentials are set
if [ -z "$E2E_OWNER_EMAIL" ]; then
    echo -e "${RED}❌ E2E_OWNER_EMAIL not set in .env.local${NC}\n"
    exit 1
fi

if [ "$E2E_OWNER_PASSWORD" = "CHANGE_THIS_PASSWORD" ]; then
    echo -e "${RED}❌ E2E_OWNER_PASSWORD still has default value${NC}"
    echo -e "   Edit .env.local and set a real password\n"
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables configured"
echo -e "   Email: ${YELLOW}$E2E_OWNER_EMAIL${NC}\n"

# Step 4: Check backend is running
echo -e "${BLUE}Checking backend...${NC}"
if curl -s http://localhost:4600/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is running at http://localhost:4600\n"
else
    echo -e "${YELLOW}⚠️  Backend not running${NC}"
    echo -e "   Start it with: ${GREEN}pnpm dev${NC}"
    echo -e "   Or with Doppler: ${GREEN}doppler run -- pnpm dev${NC}\n"

    read -p "Start backend now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Starting backend...${NC}\n"
        doppler run -- pnpm dev &
        BACKEND_PID=$!

        # Wait for backend to start
        echo -e "${YELLOW}Waiting for backend to start...${NC}"
        for i in {1..30}; do
            if curl -s http://localhost:4600/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} Backend started!\n"
                break
            fi
            sleep 1
            echo -n "."
        done
    else
        echo -e "${YELLOW}Please start backend manually and run this script again.${NC}\n"
        exit 1
    fi
fi

# Step 5: Check if test user exists in database
echo -e "${BLUE}Checking if test user exists in database...${NC}"

USER_EXISTS=$(doppler run -- psql $DATABASE_URL -t -c "
SELECT COUNT(*)
FROM \"user\" u
JOIN auth.users au ON u.id = au.id
WHERE au.email = '$E2E_OWNER_EMAIL';
" 2>/dev/null || echo "0")

USER_EXISTS=$(echo $USER_EXISTS | tr -d ' ')

if [ "$USER_EXISTS" = "0" ]; then
    echo -e "${YELLOW}⚠️  Test user not found in database${NC}"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo -e "1. Go to ${YELLOW}https://supabase.com/dashboard/project/_/auth/users${NC}"
    echo -e "2. Click 'Add User' → 'Create New User'"
    echo -e "3. Enter:"
    echo -e "   - Email: ${YELLOW}$E2E_OWNER_EMAIL${NC}"
    echo -e "   - Password: ${YELLOW}(your E2E_OWNER_PASSWORD)${NC}"
    echo -e "   - Auto Confirm: ${GREEN}✓${NC}"
    echo -e "4. After creating, run this SQL in Supabase SQL Editor:\n"

    echo -e "${YELLOW}-- Copy and paste this SQL:${NC}"
    cat << EOF

INSERT INTO "user" (id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = '$E2E_OWNER_EMAIL'),
  '$E2E_OWNER_EMAIL',
  'OWNER'
)
ON CONFLICT (id) DO UPDATE SET role = 'OWNER';

EOF
    echo -e "\n5. Run this script again after completing steps above.\n"
    exit 1
else
    echo -e "${GREEN}✓${NC} Test user exists in database\n"
fi

# Step 6: Test authentication
echo -e "${BLUE}Testing authentication...${NC}"
pnpm test:e2e auth.setup.ts --project=chromium > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Authentication test passed!\n"
else
    echo -e "${RED}❌ Authentication test failed${NC}"
    echo -e "   Run manually to see error: ${YELLOW}pnpm test:e2e auth.setup.ts${NC}\n"
    exit 1
fi

# Step 7: Ready to run tests
echo -e "${GREEN}✅ Setup complete! Ready to run E2E tests.${NC}\n"
echo -e "${BLUE}Run tests with:${NC}"
echo -e "  ${YELLOW}pnpm test:e2e crud-full-workflow.spec.ts${NC}       # Quick run"
echo -e "  ${YELLOW}pnpm test:e2e:ui${NC}                                # Visual debugging"
echo -e "  ${YELLOW}./scripts/run-crud-tests.sh${NC}                    # Helper script\n"

read -p "Run tests now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}Running E2E CRUD tests...${NC}\n"
    pnpm test:e2e crud-full-workflow.spec.ts

    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}\n"
        echo -e "${BLUE}View results:${NC}"
        echo -e "  Screenshots: ${YELLOW}apps/e2e-tests/test-results/${NC}"
        echo -e "  Report: ${YELLOW}npx playwright show-report${NC}\n"
    else
        echo -e "\n${RED}❌ Some tests failed${NC}"
        echo -e "  View report: ${YELLOW}npx playwright show-report${NC}\n"
    fi
fi
