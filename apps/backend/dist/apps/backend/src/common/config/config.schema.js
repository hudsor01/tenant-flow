"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDerivedConfig = exports.configSchema = void 0;
const zod_1 = require("zod");
const urlSchema = zod_1.z.string().url('Must be a valid URL');
const postgresUrlSchema = zod_1.z
    .string()
    .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), 'Must be a valid PostgreSQL connection string');
const jwtSecretSchema = zod_1.z
    .string()
    .min(32, 'JWT secret must be at least 32 characters for security');
const corsOriginsSchema = zod_1.z
    .string()
    .transform((str) => str.split(',').map(origin => origin.trim()))
    .refine((origins) => origins.every(origin => {
    try {
        new URL(origin);
        return true;
    }
    catch {
        return false;
    }
}), 'All CORS origins must be valid URLs')
    .superRefine((origins, ctx) => {
    if (process.env.NODE_ENV === 'production') {
        const httpOrigins = origins.filter(origin => origin.startsWith('http://'));
        if (httpOrigins.length > 0) {
            ctx.addIssue({
                code: 'custom',
                message: `Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`
            });
        }
    }
});
const portSchema = zod_1.z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 3001)
    .refine((port) => port > 0 && port < 65536, 'Port must be between 1 and 65535');
const nodeEnvSchema = zod_1.z
    .enum(['development', 'production', 'test'])
    .default('development');
exports.configSchema = zod_1.z.object({
    NODE_ENV: nodeEnvSchema,
    PORT: portSchema,
    DATABASE_URL: postgresUrlSchema,
    DIRECT_URL: postgresUrlSchema,
    DATABASE_MAX_CONNECTIONS: zod_1.z.string().optional(),
    DATABASE_CONNECTION_TIMEOUT: zod_1.z.string().optional(),
    JWT_SECRET: jwtSecretSchema,
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    SUPABASE_URL: urlSchema,
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    SUPABASE_JWT_SECRET: jwtSecretSchema,
    CORS_ORIGINS: corsOriginsSchema,
    RATE_LIMIT_TTL: zod_1.z.string().optional(),
    RATE_LIMIT_LIMIT: zod_1.z.string().optional(),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    STRIPE_PRICE_ID_STARTER: zod_1.z.string().optional(),
    STRIPE_PRICE_ID_GROWTH: zod_1.z.string().optional(),
    STRIPE_PRICE_ID_BUSINESS: zod_1.z.string().optional(),
    STRIPE_PRICE_ID_TENANTFLOW_MAX: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().optional(),
    REDIS_HOST: zod_1.z.string().optional(),
    REDIS_PORT: zod_1.z.string().optional(),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    REDIS_DB: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    ENABLE_METRICS: zod_1.z
        .string()
        .optional()
        .transform((val) => val === 'true')
        .default(false),
    STORAGE_PROVIDER: zod_1.z.enum(['local', 'supabase', 's3']).default('supabase'),
    STORAGE_BUCKET: zod_1.z.string().default('tenant-flow-storage'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    FROM_EMAIL: zod_1.z.string().email().optional(),
    CSRF_SECRET: zod_1.z.string().optional(),
    SESSION_SECRET: zod_1.z.string().min(32, 'Session secret must be at least 32 characters').optional(),
    ENABLE_SWAGGER: zod_1.z
        .string()
        .optional()
        .transform((val) => val === 'true')
        .default(false),
    ENABLE_RATE_LIMITING: zod_1.z
        .string()
        .optional()
        .transform((val) => val !== 'false')
        .default(true)
});
const createDerivedConfig = (config) => ({
    database: {
        url: config.DATABASE_URL,
        directUrl: config.DIRECT_URL,
        maxConnections: config.DATABASE_MAX_CONNECTIONS ? parseInt(config.DATABASE_MAX_CONNECTIONS) : 10,
        connectionTimeout: config.DATABASE_CONNECTION_TIMEOUT ? parseInt(config.DATABASE_CONNECTION_TIMEOUT) : 5000
    },
    supabase: {
        url: config.SUPABASE_URL,
        serviceRoleKey: config.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: config.SUPABASE_JWT_SECRET
    },
    jwt: {
        secret: config.JWT_SECRET,
        expiresIn: config.JWT_EXPIRES_IN
    },
    cors: {
        origins: Array.isArray(config.CORS_ORIGINS) ? config.CORS_ORIGINS : [config.CORS_ORIGINS]
    },
    rateLimit: {
        ttl: config.RATE_LIMIT_TTL ? parseInt(config.RATE_LIMIT_TTL) : 60000,
        limit: config.RATE_LIMIT_LIMIT ? parseInt(config.RATE_LIMIT_LIMIT) : 100
    },
    stripe: {
        secretKey: config.STRIPE_SECRET_KEY,
        publishableKey: config.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: config.STRIPE_WEBHOOK_SECRET,
        priceIds: {
            starter: config.STRIPE_PRICE_ID_STARTER,
            growth: config.STRIPE_PRICE_ID_GROWTH,
            business: config.STRIPE_PRICE_ID_BUSINESS,
            tenantflow_max: config.STRIPE_PRICE_ID_TENANTFLOW_MAX
        }
    },
    redis: {
        url: config.REDIS_URL,
        host: config.REDIS_HOST || 'localhost',
        port: config.REDIS_PORT ? parseInt(config.REDIS_PORT) : 6379,
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB ? parseInt(config.REDIS_DB) : 0
    },
    app: {
        port: config.PORT,
        nodeEnv: config.NODE_ENV,
        logLevel: config.LOG_LEVEL,
        enableMetrics: config.ENABLE_METRICS,
        enableSwagger: config.ENABLE_SWAGGER,
        enableRateLimiting: config.ENABLE_RATE_LIMITING
    },
    storage: {
        provider: config.STORAGE_PROVIDER,
        bucket: config.STORAGE_BUCKET
    },
    email: {
        smtp: {
            host: config.SMTP_HOST,
            port: config.SMTP_PORT ? parseInt(config.SMTP_PORT) : 587,
            user: config.SMTP_USER,
            pass: config.SMTP_PASS
        },
        from: config.FROM_EMAIL
    },
    security: {
        csrfSecret: config.CSRF_SECRET,
        sessionSecret: config.SESSION_SECRET
    }
});
exports.createDerivedConfig = createDerivedConfig;
