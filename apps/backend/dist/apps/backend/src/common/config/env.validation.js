"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
const common_1 = require("@nestjs/common");
function validateEnvironment() {
    const logger = new common_1.Logger('EnvValidation');
    const requiredVars = [
        'DATABASE_URL',
        'DIRECT_URL',
        'JWT_SECRET',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_JWT_SECRET',
        'CORS_ORIGINS'
    ];
    const missing = [];
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Critical environment variables missing: ${missing.join(', ')}`);
        }
        else {
            logger.warn('Running in development mode with missing environment variables');
        }
    }
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
        const origins = corsOrigins.split(',').map(origin => origin.trim());
        const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/;
        for (const origin of origins) {
            if (!validOriginPattern.test(origin)) {
                throw new Error(`Invalid CORS origin format: ${origin}. Origins must be valid URLs.`);
            }
        }
        if (process.env.NODE_ENV === 'production') {
            const httpOrigins = origins.filter(origin => origin.startsWith('http://'));
            if (httpOrigins.length > 0) {
                throw new Error(`Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`);
            }
        }
    }
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
        throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    logger.log('✅ Environment validation completed successfully');
}
