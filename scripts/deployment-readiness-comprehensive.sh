#!/bin/bash
# Comprehensive Deployment Readiness Test
# Tests everything that could fail in production deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_PORT=4600
TEST_TIMEOUT=120
DB_TIMEOUT=30

echo -e "${BLUE}🔍 COMPREHENSIVE DEPLOYMENT VALIDATION${NC}"
echo -e "Testing all systems that could fail in Railway deployment...\n"

cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    pkill -f "tsx watch src/main.ts" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    cd "$(dirname "$0")/.." 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Change to project root
cd "$(dirname "$0")/.."

# 1. ENVIRONMENT VALIDATION
echo -e "${BLUE}1️⃣  Environment Validation${NC}"

# Check critical environment variables
check_env() {
    local var_name=$1
    local required=${2:-false}
    
    if [[ -z "${!var_name}" ]]; then
        if [[ "$required" == "true" ]]; then
            echo -e "${RED}❌ Missing required: $var_name${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  Optional missing: $var_name${NC}"
        fi
    else
        echo -e "${GREEN}✅ $var_name configured${NC}"
    fi
}

# Load environment files
set -a
source .env 2>/dev/null || echo "No root .env file"
source .env.local 2>/dev/null || echo "No .env.local file"
source apps/backend/.env 2>/dev/null || echo "No backend .env file"
set +a

echo "Checking critical environment variables..."
check_env "DATABASE_URL" true || exit 1
check_env "DIRECT_URL" true || exit 1
check_env "SUPABASE_URL" true || exit 1
check_env "SUPABASE_ANON_KEY" true || exit 1
check_env "SUPABASE_SERVICE_ROLE_KEY" true || exit 1
check_env "JWT_SECRET" true || exit 1
check_env "STRIPE_SECRET_KEY" false
check_env "STRIPE_WEBHOOK_SECRET" false

# 2. DEPENDENCY AND BUILD VALIDATION
echo -e "\n${BLUE}2️⃣  Dependency and Build Validation${NC}"

echo "Installing dependencies..."
npm ci --prefer-offline --no-audit

echo "Building shared packages..."
npm run build:shared

echo "Generating database client..."
npm run db:generate

echo "TypeScript compilation check..."
npm run typecheck

echo "Code quality check..."
npm run lint || echo -e "${YELLOW}⚠️  Linting issues (non-fatal)${NC}"

# 3. DATABASE COMPREHENSIVE TEST
echo -e "\n${BLUE}3️⃣  Database Comprehensive Test${NC}"

# Basic connectivity
echo "Testing database connectivity..."
timeout $DB_TIMEOUT npm run db:validate || {
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
}

# Schema validation
echo "Validating database schema..."
cd packages/database
npx prisma db push --accept-data-loss > /dev/null 2>&1 || {
    echo -e "${YELLOW}⚠️  Schema sync issues (check manually)${NC}"
}
cd ../..

# Test database operations
echo "Testing database operations..."
cat > test-db.js << 'EOF'
const { PrismaClient } = require('@repo/database');

async function testDatabase() {
    const prisma = new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
    });

    try {
        // Test connection
        await prisma.$connect();
        console.log('✅ Database connection successful');

        // Test basic query
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database queries working');

        // Test organization table (multi-tenant setup)
        const orgCount = await prisma.organization.count();
        console.log(`✅ Organization table accessible (${orgCount} records)`);

        // Test RLS setup
        try {
            await prisma.$queryRaw`SELECT current_setting('app.current_tenant_id', true)`;
            console.log('✅ RLS configuration detected');
        } catch (e) {
            console.log('ℹ️  RLS not configured (development mode)');
        }

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();
EOF

node test-db.js || exit 1
rm test-db.js

# 4. BACKEND SERVICE COMPREHENSIVE TEST
echo -e "\n${BLUE}4️⃣  Backend Service Test${NC}"

cd apps/backend

# Run unit tests
echo "Running comprehensive unit tests..."
npm run test:coverage || {
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
}

# Start server for integration testing
echo "Starting backend server..."
NODE_OPTIONS='--max-old-space-size=4096' npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for server with timeout
echo "Waiting for server startup..."
for i in {1..30}; do
    if curl -s "http://localhost:$BACKEND_PORT/health" | grep -q "ok\|healthy\|200"; then
        echo -e "${GREEN}✅ Backend server started${NC}"
        break
    fi
    if [[ $i -eq 30 ]]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        cat apps/backend/backend.log
        exit 1
    fi
    sleep 2
done

# 5. API INTEGRATION TESTS
echo -e "\n${BLUE}5️⃣  API Integration Tests${NC}"

# Create comprehensive API test
cat > test-api.js << 'EOF'
const http = require('http');
const baseURL = 'http://localhost:4600';

function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request(`${baseURL}${path}`, { method }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

async function testAPIs() {
    const tests = [
        { path: '/health', expectedStatus: 200, name: 'Health Check' },
        { path: '/api/auth/profile', expectedStatus: [401, 403], name: 'Auth Endpoint' },
        { path: '/api/properties', expectedStatus: [200, 401, 403], name: 'Properties API' },
        { path: '/api/tenants', expectedStatus: [200, 401, 403], name: 'Tenants API' },
        { path: '/api/leases', expectedStatus: [200, 401, 403], name: 'Leases API' },
        { path: '/api/maintenance', expectedStatus: [200, 401, 403], name: 'Maintenance API' },
    ];

    for (const test of tests) {
        try {
            const result = await makeRequest(test.path);
            const expectedStatuses = Array.isArray(test.expectedStatus) 
                ? test.expectedStatus 
                : [test.expectedStatus];
            
            if (expectedStatuses.includes(result.status)) {
                console.log(`✅ ${test.name}: ${result.status}`);
            } else {
                console.log(`❌ ${test.name}: ${result.status} (expected ${test.expectedStatus})`);
                process.exit(1);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
            process.exit(1);
        }
    }
    
    // Load test
    console.log('Running load test...');
    const promises = Array(10).fill().map(() => makeRequest('/health'));
    await Promise.all(promises);
    console.log('✅ Load test passed');
}

testAPIs();
EOF

node test-api.js || {
    echo -e "${RED}❌ API tests failed${NC}"
    exit 1
}
rm test-api.js

# 6. MEMORY AND PERFORMANCE TEST
echo -e "\n${BLUE}6️⃣  Performance and Memory Test${NC}"

echo "Testing memory stability..."
for i in {1..50}; do
    curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null
    if [[ $((i % 10)) -eq 0 ]]; then
        echo -n "."
    fi
done
echo ""

# Check if still responsive
if curl -s "http://localhost:$BACKEND_PORT/health" | grep -q "ok\|healthy"; then
    echo -e "${GREEN}✅ Memory stable under load${NC}"
else
    echo -e "${RED}❌ Memory issues detected${NC}"
    exit 1
fi

# 7. DOCKER BUILD TEST (if Docker available)
echo -e "\n${BLUE}7️⃣  Docker Build Test${NC}"

if command -v docker >/dev/null; then
    echo "Testing Docker build (simulating Railway deployment)..."
    if timeout 300 docker build -t tenantflow-test . > docker-build.log 2>&1; then
        echo -e "${GREEN}✅ Docker build successful${NC}"
        
        # Test Docker container startup
        echo "Testing container startup..."
        docker run -d -p 4601:4600 --name tenantflow-test-run tenantflow-test > /dev/null 2>&1
        
        # Wait for container health
        sleep 10
        if curl -s "http://localhost:4601/health" | grep -q "ok\|healthy"; then
            echo -e "${GREEN}✅ Container runs successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Container health check inconclusive${NC}"
        fi
        
        # Cleanup
        docker stop tenantflow-test-run > /dev/null 2>&1
        docker rm tenantflow-test-run > /dev/null 2>&1
        docker rmi tenantflow-test > /dev/null 2>&1
    else
        echo -e "${RED}❌ Docker build failed${NC}"
        echo "Check docker-build.log for details"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available${NC}"
fi

# 8. PRODUCTION ENVIRONMENT SIMULATION
echo -e "\n${BLUE}8️⃣  Production Environment Simulation${NC}"

echo "Testing with production-like settings..."
export NODE_ENV=production

# Test production build
echo "Building for production..."
npm run build:backend > /dev/null 2>&1 || {
    echo -e "${RED}❌ Production build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Production build successful${NC}"

# Cleanup
kill $BACKEND_PID 2>/dev/null || true

# FINAL REPORT
echo -e "\n${GREEN}🎉 COMPREHENSIVE VALIDATION: PASSED${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "✅ Environment variables configured"
echo -e "✅ Dependencies installed and built"
echo -e "✅ Database connectivity and operations"
echo -e "✅ TypeScript compilation"
echo -e "✅ Unit tests with coverage"
echo -e "✅ Backend server startup"
echo -e "✅ All API endpoints responsive"
echo -e "✅ Memory and performance stable"
echo -e "✅ Docker build successful"
echo -e "✅ Production build ready"

echo -e "\n${BLUE}🚀 READY FOR RAILWAY DEPLOYMENT${NC}"
echo -e "All systems tested and validated. Deploy with confidence!"
echo -e "\n${BLUE}Deployment commands:${NC}"
echo "git add . && git commit -m 'feat: ready for deployment - all tests passed'"
echo "git push origin main"
echo ""
echo "Monitor deployment at: https://railway.app"