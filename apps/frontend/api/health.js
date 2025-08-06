export default function handler(req, res) {
  // Simple health check endpoint for Vercel deployments
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'tenantflow-frontend',
    version: process.env.VERCEL_GIT_COMMIT_SHA || '1.0.0',
    region: process.env.VERCEL_REGION || 'unknown',
    deployment: {
      url: process.env.VERCEL_URL || 'localhost',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json(healthCheck);
}