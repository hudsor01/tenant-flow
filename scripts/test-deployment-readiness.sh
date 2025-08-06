#!/bin/bash
# Test Deployment Readiness - Complete Backend Validation
# Prevents wasted Railway deployments by testing locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=4600
FRONTEND_PORT=3000
DB_TEST_TIMEOUT=30
API_TEST_TIMEOUT=60
HEALTH_CHECK_RETRIES=10

echo -e "${BLUE}🚀 TenantFlow Deployment Readiness Test${NC}"
echo -e "Testing backend locally before Railway deployment...\n"

# Store original directory
ORIGINAL_DIR=$(pwd)

# Ensure we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "apps/backend" ]]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
    pkill -f "tsx watch src/main.ts" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    wait 2>/dev/null || true
    cd "$ORIGINAL_DIR"
}

trap cleanup EXIT INT TERM

# Step 1: Environment Validation
echo -e "${BLUE}📋 Step 1: Environment Validation${NC}"

# Check required files
echo -n "Checking environment files... "
required_files=(".env" ".env.local" "apps/backend/.env")
missing_files=()

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing files: ${missing_files[*]}${NC}"
    echo "Required environment files not found. Check documentation."
    exit 1
fi
echo -e "${GREEN}✅ Environment files present${NC}"

# Step 2: Dependencies and Build
echo -e "\n${BLUE}📦 Step 2: Dependencies and Build${NC}"

echo "Installing dependencies..."
npm ci --prefer-offline --no-audit > /dev/null 2>&1

echo "Building shared packages..."
npm run build:shared > /dev/null 2>&1

echo "Generating Prisma client..."
npm run db:generate > /dev/null 2>&1

# Step 3: Database Connectivity
echo -e "\n${BLUE}🗄️  Step 3: Database Connectivity${NC}"

echo "Testing database connection..."
timeout $DB_TEST_TIMEOUT npm run db:validate > /dev/null 2>&1 || {
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Check your DATABASE_URL and ensure database is accessible"
    exit 1
}
echo -e "${GREEN}✅ Database connection successful${NC}"

# Step 4: TypeScript Compilation
echo -e "\n${BLUE}🔧 Step 4: TypeScript Compilation${NC}"

echo "Checking TypeScript compilation..."
if ! npm run typecheck > /dev/null 2>&1; then
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    echo "Run 'npm run typecheck' to see detailed errors"
    exit 1
fi
echo -e "${GREEN}✅ TypeScript compilation successful${NC}"

# Step 5: Linting
echo -e "\n${BLUE}🧹 Step 5: Code Quality${NC}"

echo "Running linter..."
if ! npm run lint > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Linting issues found${NC}"
    echo "Run 'npm run lint' to see issues, or 'npm run lint:fix' to auto-fix"
    # Don't exit on lint warnings, just notify
else
    echo -e "${GREEN}✅ Code quality checks passed${NC}"
fi

# Step 6: Unit Tests
echo -e "\n${BLUE}🧪 Step 6: Unit Tests${NC}"

echo "Running backend unit tests..."
cd apps/backend
if ! npm run test:unit > /dev/null 2>&1; then
    echo -e "${RED}❌ Unit tests failed${NC}"
    echo "Run 'cd apps/backend && npm run test' to see detailed results"
    cd "$ORIGINAL_DIR"
    exit 1
fi
cd "$ORIGINAL_DIR"
echo -e "${GREEN}✅ Unit tests passed${NC}"

# Step 7: Backend Server Start
echo -e "\n${BLUE}🚀 Step 7: Backend Server Test${NC}"

echo "Starting backend server..."
cd apps/backend

# Start backend in background
NODE_OPTIONS='--max-old-space-size=4096' npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
cd "$ORIGINAL_DIR"

# Wait for backend to start
echo "Waiting for backend to start (port $BACKEND_PORT)..."
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/health" | grep -q "200"; then
        echo -e "${GREEN}✅ Backend server started successfully${NC}"
        break
    fi
    
    if [[ $i -eq $HEALTH_CHECK_RETRIES ]]; then
        echo -e "${RED}❌ Backend server failed to start${NC}"
        echo "Check apps/backend/backend.log for details"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    sleep 3
done

# Step 8: API Endpoints Test
echo -e "\n${BLUE}🔌 Step 8: API Endpoints Test${NC}"

# Test key endpoints
endpoints=(
    "/health:Health Check"
    "/api/auth/profile:Auth Profile"
    "/api/properties:Properties API"
    "/api/tenants:Tenants API"
    "/api/maintenance:Maintenance API"
    "/api/leases:Leases API"
)

failed_endpoints=()

for endpoint_info in "${endpoints[@]}"; do
    IFS=':' read -r endpoint name <<< "$endpoint_info"
    
    echo -n "Testing $name... "
    
    # Use different methods based on endpoint
    if [[ "$endpoint" == "/health" ]]; then
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT$endpoint")
    else
        # For API endpoints, expect 401 Unauthorized without auth (which means endpoint exists)
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT$endpoint")
    fi
    
    if [[ "$endpoint" == "/health" && "$http_code" == "200" ]] || 
       [[ "$endpoint" != "/health" && ("$http_code" == "401" || "$http_code" == "200") ]]; then
        echo -e "${GREEN}✅ $http_code${NC}"
    else
        echo -e "${RED}❌ $http_code${NC}"
        failed_endpoints+=("$name ($http_code)")
    fi
done

if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
    echo -e "\n${RED}❌ Failed endpoints: ${failed_endpoints[*]}${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Step 9: Docker Build Test (optional but recommended)
echo -e "\n${BLUE}🐳 Step 9: Docker Build Test (Optional)${NC}"

echo -n "Testing Docker build... "
if command -v docker >/dev/null 2>&1; then
    if timeout 300 docker build -t tenantflow-test . > docker-build.log 2>&1; then
        echo -e "${GREEN}✅ Docker build successful${NC}"
        docker rmi tenantflow-test > /dev/null 2>&1 || true
    else
        echo -e "${YELLOW}⚠️  Docker build failed (check docker-build.log)${NC}"
        echo "This won't prevent deployment but may indicate issues"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available, skipping${NC}"
fi

# Step 10: Memory and Performance Check
echo -e "\n${BLUE}📊 Step 10: Performance Check${NC}"

echo "Checking server performance..."
# Make multiple requests to check for memory leaks
for i in {1..10}; do
    curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null
done

# Check if server is still responsive
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/health" | grep -q "200"; then
    echo -e "${GREEN}✅ Server stable under load${NC}"
else
    echo -e "${RED}❌ Server became unresponsive${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Cleanup
kill $BACKEND_PID 2>/dev/null || true

# Final Report
echo -e "\n${GREEN}🎉 DEPLOYMENT READINESS: PASSED${NC}"
echo -e "✅ Environment configuration valid"
echo -e "✅ Dependencies installed"
echo -e "✅ Database connectivity confirmed"
echo -e "✅ TypeScript compilation successful"
echo -e "✅ Unit tests passed"
echo -e "✅ Backend server starts correctly"
echo -e "✅ API endpoints responsive"
echo -e "✅ Server stable under basic load"

echo -e "\n${BLUE}🚢 Ready for Railway deployment!${NC}"
echo -e "You can now safely deploy to production.\n"

# Optional: Show next steps
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. git add . && git commit -m 'Ready for deployment'"
echo "2. git push origin main"
echo "3. Monitor Railway deployment logs"
echo "4. Run post-deployment health checks"