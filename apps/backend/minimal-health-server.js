#!/usr/bin/env node

/**
 * Minimal health check server to test Railway deployment
 * This simulates how the production server would respond
 */

const http = require('http');
const PORT = process.env.PORT || 4600;

// Simulate the actual health check responses
const endpoints = {
  '/ping': {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  },
  '/health': {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: 'healthy',
    databaseResponseTime: 45,
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
    },
    _meta: {
      apiVersion: 'v1',
      timestamp: new Date().toISOString()
    }
  },
  '/': {
    status: 'ok',
    service: 'tenantflow-backend',
    version: '1.0.0',
    health: '/health',
    detailed: '/health/detailed',
    ping: '/ping'
  }
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - User-Agent: ${req.headers['user-agent']}`);
  
  // Simulate response time
  const delay = Math.random() * 50; // 0-50ms random delay
  
  setTimeout(() => {
    const endpoint = endpoints[req.url];
    
    if (endpoint) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(endpoint));
      console.log(`  ✅ 200 OK - ${req.url}`);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
      console.log(`  ❌ 404 Not Found - ${req.url}`);
    }
  }, delay);
});

server.listen(PORT, () => {
  console.log(`
=== Minimal Health Check Server ===
Server running at http://localhost:${PORT}
Environment: ${process.env.NODE_ENV || 'development'}

Available endpoints:
  - /ping   : Quick health check (Railway configured)
  - /health : Full health status
  - /       : Root endpoint info

This simulates how your production server should respond.
Run the test script in another terminal:
  node test-production-health.js
`);
});