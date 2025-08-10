"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONFIG = void 0;
exports.validateConfig = validateConfig;
exports.getFrontendUrl = getFrontendUrl;
exports.APP_CONFIG = {
    FRONTEND_URL: process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'https://tenantflow.app'
            : 'http://tenantflow.app'),
    API_PORT: process.env.PORT || '3002',
    API_PREFIX: '/api',
    ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(',') || [],
    DEV_PORTS: {
        FRONTEND: ['5172', '5173', '5174', '5175'],
        BACKEND: ['3000', '3001', '3002', '3003', '3004']
    },
    SUPABASE: {
        URL: process.env.SUPABASE_URL,
        SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        ANON_KEY: process.env.SUPABASE_ANON_KEY
    },
    STRIPE: {
        SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        PORTAL_RETURN_URL: process.env.STRIPE_PORTAL_RETURN_URL ||
            process.env.FRONTEND_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://tenantflow.app/settings/billing'
                : 'http://tenantflow.app/settings/billing')
    },
    EMAIL: {
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@tenantflow.app',
        SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@tenantflow.app'
    },
    FEATURES: {
        ENABLE_TELEMETRY: process.env.ENABLE_TELEMETRY === 'true',
        ENABLE_DEBUG_LOGGING: process.env.ENABLE_DEBUG_LOGGING === 'true',
        ENABLE_MAINTENANCE_MODE: process.env.ENABLE_MAINTENANCE_MODE === 'true'
    },
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    IS_TEST: process.env.NODE_ENV === 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000,
        MAX_REQUESTS: process.env.RATE_LIMIT_MAX || 100
    }
};
function validateConfig() {
    const requiredVars = [
        { key: 'DATABASE_URL', value: exports.APP_CONFIG.DATABASE_URL },
        { key: 'JWT_SECRET', value: exports.APP_CONFIG.JWT_SECRET },
        { key: 'SUPABASE_URL', value: exports.APP_CONFIG.SUPABASE.URL },
        {
            key: 'SUPABASE_SERVICE_ROLE_KEY',
            value: exports.APP_CONFIG.SUPABASE.SERVICE_KEY
        }
    ];
    const missing = requiredVars
        .filter(({ value }) => !value)
        .map(({ key }) => key);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file and ensure all required variables are set.');
    }
}
function getFrontendUrl(path = '') {
    const baseUrl = exports.APP_CONFIG.FRONTEND_URL.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}
