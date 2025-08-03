// Minimal startup for Railway health checks
import * as http from 'http'

const PORT = parseInt(process.env.PORT || '4600', 10)

console.warn('🚀 Starting minimal Railway health server...')
console.warn(`PORT: ${PORT}`)
console.warn(`NODE_ENV: ${process.env.NODE_ENV}`)

const server = http.createServer((req, res) => {
  console.warn(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      port: PORT 
    }))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.warn(`✅ Health server listening on 0.0.0.0:${PORT}`)
  console.warn(`Health check: http://0.0.0.0:${PORT}/health`)
  
  // After health check passes, start the real app
  setTimeout(() => {
    console.warn('Starting main application...')
    void import('./main')
  }, 2000)
})

server.on('error', (err) => {
  console.error('Server error:', err)
  process.exit(1)
})