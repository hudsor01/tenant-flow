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
