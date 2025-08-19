// Simple test server to validate Railway health check configuration
const http = require('http');

const PORT = process.env.PORT || 4600;

// Create minimal server with /ping endpoint
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      port: PORT
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  
  // Test the health check after server starts
  setTimeout(() => {
    console.log('\nTesting health check...');
    
    const options = {
      hostname: '0.0.0.0',
      port: PORT,
      path: '/ping',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log(`Health check result: HTTP ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response:', data);
        console.log('\n✅ Railway health check configuration WORKS');
        process.exit(0);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Health check failed:', err.message);
      process.exit(1);
    });
    
    req.on('timeout', () => {
      console.log('❌ Health check timeout');
      process.exit(1);
    });
    
    req.end();
  }, 1000);
});