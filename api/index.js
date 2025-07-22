// Vercel serverless function - Main API entry point
// Provides basic API information and routing

export default async function handler(req, res) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', 'https://tenantflow.app');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
    }

    // Only allow GET requests for this endpoint
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed', 
            allowedMethods: ['GET'] 
        });
    }

    try {
        // API information and available endpoints
        const apiInfo = {
            name: 'TenantFlow API',
            version: '1.0.0',
            status: 'operational',
            timestamp: new Date().toISOString(),
            endpoints: {
                health: '/api/health',
                healthV1: '/api/v1/health',
                documentation: 'https://tenantflow.app/docs',
                support: 'https://tenantflow.app/contact'
            },
            environment: process.env.NODE_ENV || 'production',
            description: 'TenantFlow Property Management API - Serverless Functions'
        };

        // Set security headers
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        // Set CORS headers (restricted to tenantflow.app domain) 
        res.setHeader('Access-Control-Allow-Origin', 'https://tenantflow.app');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');

        return res.status(200).json(apiInfo);
        
    } catch (error) {
        console.error('API endpoint error:', error);
        
        // Return minimal error information for security
        return res.status(500).json({
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
}