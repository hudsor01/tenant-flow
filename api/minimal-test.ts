import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Test environment variables are available
    const hasDbUrl = !!process.env.DATABASE_URL
    const hasJwtSecret = !!process.env.JWT_SECRET
    
    const response = {
      status: 'ok',
      message: 'TenantFlow API - Minimal Test',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      environment: {
        nodeVersion: process.version,
        vercelRegion: process.env.VERCEL_REGION || 'unknown',
        nodeEnv: process.env.NODE_ENV || 'production',
        hasEnvironmentVars: {
          DATABASE_URL: hasDbUrl,
          JWT_SECRET: hasJwtSecret
        }
      }
    }

    res.setHeader('Content-Type', 'application/json')
    res.status(200).json(response)
    
  } catch (error) {
    console.error('Minimal test error:', error)
    
    res.setHeader('Content-Type', 'application/json')
    res.status(500).json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}