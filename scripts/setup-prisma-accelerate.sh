#!/bin/bash

# Setup script for Prisma Accelerate
# This script configures Prisma Accelerate for edge deployment optimization

set -e

echo "🚀 Setting up Prisma Accelerate..."

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "apps/backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install Prisma Accelerate extension if not already installed
echo "📦 Installing Prisma Accelerate extension..."
cd apps/backend
if ! grep -q "@prisma/extension-accelerate" package.json; then
    npm install @prisma/extension-accelerate
    echo "✅ Installed @prisma/extension-accelerate"
else
    echo "✅ @prisma/extension-accelerate already installed"
fi

# Update .env.example with Accelerate configuration
cd ../..
echo ""
echo "🔧 Updating environment configuration..."

if [ -f "apps/backend/.env.example" ]; then
    if ! grep -q "PRISMA_ACCELERATE_URL" apps/backend/.env.example; then
        echo "" >> apps/backend/.env.example
        echo "# Prisma Accelerate Configuration" >> apps/backend/.env.example
        echo "PRISMA_ACCELERATE_URL=" >> apps/backend/.env.example
        echo "PRISMA_ACCELERATE_SECRET=" >> apps/backend/.env.example
        echo "ENABLE_PRISMA_ACCELERATE=false" >> apps/backend/.env.example
        echo "✅ Added Prisma Accelerate configuration to .env.example"
    else
        echo "✅ Prisma Accelerate configuration already exists in .env.example"
    fi
fi

# Update .env.local if it exists
if [ -f "apps/backend/.env.local" ]; then
    if ! grep -q "PRISMA_ACCELERATE_URL" apps/backend/.env.local; then
        echo "" >> apps/backend/.env.local
        echo "# Prisma Accelerate Configuration" >> apps/backend/.env.local
        echo "PRISMA_ACCELERATE_URL=" >> apps/backend/.env.local
        echo "PRISMA_ACCELERATE_SECRET=" >> apps/backend/.env.local
        echo "ENABLE_PRISMA_ACCELERATE=false" >> apps/backend/.env.local
        echo "✅ Added Prisma Accelerate configuration to .env.local"
    else
        echo "✅ Prisma Accelerate configuration already exists in .env.local"
    fi
fi

# Check if AccelerateModule is imported in app.module.ts
echo ""
echo "🔗 Checking module imports..."
if grep -q "AccelerateModule" apps/backend/src/app.module.ts; then
    echo "✅ AccelerateModule already imported in app.module.ts"
else
    echo "⚠️  You need to manually import AccelerateModule in app.module.ts"
    echo "   Add this to your imports array:"
    echo "   import { AccelerateModule } from './database/prisma-accelerate/accelerate.module'"
fi

# Generate Prisma client with Accelerate extension
echo ""
echo "🔄 Regenerating Prisma client..."
cd apps/backend
npx prisma generate
echo "✅ Prisma client regenerated"

# Create health check endpoint
echo ""
echo "🏥 Creating health check endpoint..."
HEALTH_CHECK_PATH="src/common/health/accelerate-health.controller.ts"
mkdir -p "$(dirname "$HEALTH_CHECK_PATH")"

if [ ! -f "$HEALTH_CHECK_PATH" ]; then
cat > "$HEALTH_CHECK_PATH" << 'EOF'
import { Controller, Get } from '@nestjs/common'
import { PrismaAccelerateService } from '../../database/prisma-accelerate/accelerate.service'
import { CachingStrategyService } from '../../database/prisma-accelerate/caching-strategy.service'

@Controller('health/accelerate')
export class AccelerateHealthController {
  constructor(
    private readonly accelerateService: PrismaAccelerateService,
    private readonly cachingStrategy: CachingStrategyService
  ) {}

  @Get('status')
  async getAccelerateStatus() {
    const health = await this.accelerateService.healthCheck()
    const metrics = await this.cachingStrategy.getCacheMetrics()
    
    return {
      timestamp: new Date().toISOString(),
      accelerate: {
        enabled: health.accelerate,
        standard: health.standard,
        poolStats: await this.accelerateService.getPoolStats()
      },
      cache: {
        enabled: metrics.accelerateEnabled,
        hitRate: metrics.cacheHitRate,
        strategies: Object.keys(metrics.strategies)
      }
    }
  }

  @Get('metrics')
  async getMetrics() {
    return await this.cachingStrategy.getCacheMetrics()
  }

  @Get('pool-stats')
  async getPoolStats() {
    return await this.accelerateService.getPoolStats()
  }
}
EOF
    echo "✅ Created health check controller"
else
    echo "✅ Health check controller already exists"
fi

cd ../..

# Create monitoring script
echo ""
echo "📊 Creating monitoring script..."
MONITOR_SCRIPT="scripts/monitor-accelerate.js"

if [ ! -f "$MONITOR_SCRIPT" ]; then
cat > "$MONITOR_SCRIPT" << 'EOF'
#!/usr/bin/env node

const axios = require('axios')

async function monitorAccelerate() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
  
  try {
    console.log('🔍 Monitoring Prisma Accelerate...\n')
    
    // Get health status
    const healthResponse = await axios.get(`${baseUrl}/health/accelerate/status`)
    const health = healthResponse.data
    
    console.log(`⏰ Timestamp: ${health.timestamp}`)
    console.log(`🚀 Accelerate Enabled: ${health.accelerate.enabled ? '✅' : '❌'}`)
    console.log(`📊 Standard Connection: ${health.accelerate.standard ? '✅' : '❌'}`)
    console.log(`💾 Cache Hit Rate: ${health.cache.hitRate ? (health.cache.hitRate * 100).toFixed(2) + '%' : 'N/A'}`)
    
    if (health.accelerate.poolStats) {
      const pool = health.accelerate.poolStats
      console.log('\n📈 Pool Statistics:')
      console.log(`   Active Connections: ${pool.activeConnections || 0}`)
      console.log(`   Idle Connections: ${pool.idleConnections || 0}`)
      console.log(`   Total Connections: ${pool.totalConnections || 0}`)
      console.log(`   Max Connections: ${pool.maxConnections || 0}`)
    }
    
    // Get metrics
    const metricsResponse = await axios.get(`${baseUrl}/health/accelerate/metrics`)
    const metrics = metricsResponse.data
    
    console.log('\n🎯 Cache Strategies:')
    Object.entries(metrics.strategies).forEach(([key, config]) => {
      console.log(`   ${key}: TTL ${config.ttl}s, SWR ${config.swr}s`)
    })
    
  } catch (error) {
    console.error('❌ Error monitoring Accelerate:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure your backend server is running on port 3001')
    }
  }
}

// Run monitoring
monitorAccelerate()

// Set up periodic monitoring if --watch flag is provided
if (process.argv.includes('--watch')) {
  console.log('👀 Watching Accelerate metrics (press Ctrl+C to stop)...\n')
  setInterval(monitorAccelerate, 30000) // Every 30 seconds
}
EOF
    chmod +x "$MONITOR_SCRIPT"
    echo "✅ Created monitoring script"
else
    echo "✅ Monitoring script already exists"
fi

# Create performance test script
echo ""
echo "⚡ Creating performance test script..."
PERF_SCRIPT="scripts/test-accelerate-performance.js"

if [ ! -f "$PERF_SCRIPT" ]; then
cat > "$PERF_SCRIPT" << 'EOF'
#!/usr/bin/env node

const axios = require('axios')

async function testPerformance() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
  const userId = process.env.TEST_USER_ID || 'test-user-id'
  
  console.log('⚡ Testing Prisma Accelerate Performance...\n')
  
  // Test configurations
  const tests = [
    {
      name: 'Property List (Cached)',
      endpoint: `/api/properties`,
      params: { limit: 20 }
    },
    {
      name: 'Property Details (Cached)',
      endpoint: `/api/properties/test-property-id`,
      params: {}
    },
    {
      name: 'Analytics Query (Cached)', 
      endpoint: `/api/properties/stats`,
      params: {}
    }
  ]
  
  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`)
    
    const times = []
    const iterations = 5
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      
      try {
        await axios.get(`${baseUrl}${test.endpoint}`, {
          params: test.params,
          headers: {
            'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
          }
        })
        
        const duration = Date.now() - start
        times.push(duration)
        
        process.stdout.write(`   Run ${i + 1}: ${duration}ms `)
      } catch (error) {
        console.error(`❌ Error in run ${i + 1}:`, error.response?.status || error.message)
      }
    }
    
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const min = Math.min(...times)
      const max = Math.max(...times)
      
      console.log(`\n   📊 Average: ${avg.toFixed(2)}ms | Min: ${min}ms | Max: ${max}ms`)
      
      if (avg < 100) {
        console.log('   🚀 Excellent performance!')
      } else if (avg < 500) {
        console.log('   ✅ Good performance')
      } else {
        console.log('   ⚠️  Performance could be improved')
      }
    }
    
    console.log('')
  }
  
  // Test cache effectiveness
  console.log('💾 Testing cache effectiveness...')
  
  const cacheTest = async (endpoint) => {
    const start1 = Date.now()
    await axios.get(`${baseUrl}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}` }
    })
    const firstRequest = Date.now() - start1
    
    const start2 = Date.now()
    await axios.get(`${baseUrl}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}` }
    })
    const secondRequest = Date.now() - start2
    
    const improvement = ((firstRequest - secondRequest) / firstRequest) * 100
    
    console.log(`   First request: ${firstRequest}ms`)
    console.log(`   Second request (cached): ${secondRequest}ms`)
    console.log(`   Cache improvement: ${improvement.toFixed(1)}%`)
    
    return improvement > 10 // Consider it effective if >10% improvement
  }
  
  try {
    const cacheEffective = await cacheTest('/api/properties')
    console.log(`   Cache effectiveness: ${cacheEffective ? '✅ Effective' : '⚠️  Limited benefit'}`)
  } catch (error) {
    console.error('   ❌ Cache test failed:', error.message)
  }
}

testPerformance().catch(console.error)
EOF
    chmod +x "$PERF_SCRIPT"
    echo "✅ Created performance test script"
else
    echo "✅ Performance test script already exists"
fi

# Update package.json scripts
echo ""
echo "📝 Updating package.json scripts..."

# Check if scripts exist
if ! grep -q "accelerate:monitor" package.json; then
    # Create temporary file with new scripts
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['accelerate:monitor'] = 'node scripts/monitor-accelerate.js';
    pkg.scripts['accelerate:monitor:watch'] = 'node scripts/monitor-accelerate.js --watch';
    pkg.scripts['accelerate:test'] = 'node scripts/test-accelerate-performance.js';
    pkg.scripts['accelerate:health'] = 'curl -s http://localhost:3001/health/accelerate/status | jq .';
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    echo "✅ Added Accelerate scripts to package.json"
else
    echo "✅ Accelerate scripts already exist in package.json"
fi

echo ""
echo "✅ Prisma Accelerate setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure your Prisma Accelerate URL and secret in .env.local"
echo "2. Set ENABLE_PRISMA_ACCELERATE=true in your environment"
echo "3. Import AccelerateModule in your app.module.ts if not already done"
echo "4. Start your application and test with: npm run accelerate:monitor"
echo "5. Run performance tests with: npm run accelerate:test"
echo ""
echo "🔗 Useful Commands:"
echo "   npm run accelerate:monitor         # Check Accelerate status"
echo "   npm run accelerate:monitor:watch   # Monitor continuously"
echo "   npm run accelerate:test            # Run performance tests"
echo "   npm run accelerate:health          # Quick health check"
echo ""
echo "📚 Documentation: Check docs/prisma-accelerate.md for detailed setup"