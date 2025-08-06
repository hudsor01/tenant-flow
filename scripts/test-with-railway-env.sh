#!/bin/bash
# Test Backend with Railway Environment - Production-like Local Testing

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚄 Railway Environment Local Testing${NC}"
echo -e "Testing backend with production environment variables...\n"

# Check if Railway CLI is installed
if ! command -v railway >/dev/null 2>&1; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami >/dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Login with: railway login"
    exit 1
fi

# Check if project is linked
if ! railway status >/dev/null 2>&1; then
    echo -e "${RED}❌ Project not linked to Railway${NC}"
    echo "Link with: railway link"
    exit 1
fi

cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
    pkill -f "tsx watch src/main.ts" 2>/dev/null || true
    pkill -f "railway run" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo -e "${BLUE}📋 Step 1: Railway Environment Check${NC}"

echo "Checking Railway project status..."
railway status

echo -e "\n${BLUE}🔧 Step 2: Building with Railway Environment${NC}"

echo "Building shared packages with Railway env..."
railway run npm run build:shared >/dev/null 2>&1

echo "Generating Prisma client with Railway database..."
railway run npm run db:generate >/dev/null 2>&1

echo -e "\n${BLUE}🗄️  Step 3: Database Test with Railway${NC}"

echo "Testing Railway database connectivity..."
railway run npm run db:validate || {
    echo -e "${RED}❌ Railway database connection failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Railway database connection successful${NC}"

echo -e "\n${BLUE}🚀 Step 4: Backend with Railway Environment${NC}"

echo "Starting backend with Railway environment variables..."
cd apps/backend

# Start backend with Railway environment in background
railway run npm run dev > railway-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for server to start
echo "Waiting for server startup with Railway config..."
for i in {1..20}; do
    if curl -s "http://localhost:4600/health" | grep -q "ok\|healthy" 2>/dev/null; then
        echo -e "${GREEN}✅ Backend started with Railway environment${NC}"
        break
    fi
    
    if [[ $i -eq 20 ]]; then
        echo -e "${RED}❌ Backend failed to start with Railway env${NC}"
        echo "Check apps/backend/railway-backend.log"
        exit 1
    fi
    sleep 3
done

echo -e "\n${BLUE}🔌 Step 5: Production-like API Testing${NC}"

# Test endpoints with production environment
endpoints=(
    "/health:Health Check"
    "/api/auth/profile:Auth System"
    "/api/properties:Properties API"
    "/api/tenants:Tenants API"
    "/api/maintenance:Maintenance API"
    "/api/leases:Leases API"
)

for endpoint_info in "${endpoints[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    
    echo -n "Testing $name with Railway config... "
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4600$endpoint")
    
    if [[ "$endpoint" == "/health" && "$http_code" == "200" ]] || 
       [[ "$endpoint" != "/health" && ("$http_code" == "401" || "$http_code" == "200") ]]; then
        echo -e "${GREEN}✅ $http_code${NC}"
    else
        echo -e "${RED}❌ $http_code${NC}"
        echo "Endpoint failed with Railway environment"
        exit 1
    fi
done

echo -e "\n${BLUE}🧪 Step 6: Database Operations Test${NC}"

echo "Testing database operations with Railway env..."
railway run node -e "
const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();

async function test() {
    try {
        await prisma.\$connect();
        console.log('✅ Railway database connection working');
        
        const orgCount = await prisma.organization.count();
        console.log(\`✅ Can query Railway database (\${orgCount} organizations)\`);
        
        await prisma.\$disconnect();
    } catch (error) {
        console.error('❌ Railway database test failed:', error.message);
        process.exit(1);
    }
}

test();
" || {
    echo -e "${RED}❌ Railway database operations failed${NC}"
    exit 1
}

echo -e "\n${BLUE}🏋️  Step 7: Load Test with Railway Config${NC}"

echo "Running load test with Railway environment..."
for i in {1..20}; do
    curl -s "http://localhost:4600/health" >/dev/null &
done
wait

# Check if still responsive
if curl -s "http://localhost:4600/health" | grep -q "ok\|healthy"; then
    echo -e "${GREEN}✅ Server stable under load with Railway config${NC}"
else
    echo -e "${RED}❌ Server unstable with Railway environment${NC}"
    exit 1
fi

# Final success
kill $BACKEND_PID 2>/dev/null || true

echo -e "\n${GREEN}🎉 RAILWAY ENVIRONMENT TEST: PASSED${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "✅ Railway CLI connected and authenticated"
echo -e "✅ Production environment variables loaded"
echo -e "✅ Railway database connectivity confirmed"
echo -e "✅ Backend runs successfully with Railway config"
echo -e "✅ All API endpoints responsive with Railway env"
echo -e "✅ Database operations working with Railway"
echo -e "✅ Server stable under load with production config"

echo -e "\n${BLUE}🚢 This is exactly how your app will run on Railway!${NC}"
echo -e "Deploy with confidence using: railway up"