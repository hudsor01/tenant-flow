import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Simple health check without NestJS overhead
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'tenantflow-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime()
  }

  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60')
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json(health)
}