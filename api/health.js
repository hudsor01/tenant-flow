// Vercel serverless function for API health check
// This endpoint provides basic health status for the API monitoring system

export default async function handler(req, res) {
    // Only allow GET and HEAD requests for health checks
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ 
            error: 'Method not allowed', 
            allowedMethods: ['GET', 'HEAD'] 
        });
    }

    try {
        // Basic health data
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: process.memoryUsage().heapUsed,
                total: process.memoryUsage().heapTotal,
                percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
            },
            environment: process.env.NODE_ENV || 'production',
            version: '1.0.0'
        };

        // Add database connectivity check (placeholder)
        // In a real implementation, you would check your database connection here
        healthData.database = {
            connected: true,
            latency: Math.floor(Math.random() * 50) + 10 // Simulated latency
        };

        // Set security headers
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Set CORS headers (restricted to tenantflow.app domain)
        res.setHeader('Access-Control-Allow-Origin', 'https://tenantflow.app');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        // Set cache headers for health endpoint
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Return health status
        return res.status(200).json(healthData);
        
    } catch (error) {
        console.error('Health check error:', error);
        
        // Return minimal error information for security
        return res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Service temporarily unavailable'
        });
    }
}