"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvValidator = void 0;
const common_1 = require("@nestjs/common");
class EnvValidator {
    static { this.logger = new common_1.Logger('EnvValidator'); }
    static { this.config = {
        required: [
            'DATABASE_URL',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'SUPABASE_JWT_SECRET',
            'NODE_ENV',
            'PORT',
        ],
        optional: [
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_STARTER_MONTHLY',
            'STRIPE_STARTER_ANNUAL',
            'STRIPE_GROWTH_MONTHLY',
            'STRIPE_GROWTH_ANNUAL',
            'STRIPE_TENANTFLOW_MAX_MONTHLY',
            'STRIPE_TENANTFLOW_MAX_ANNUAL',
            'RESEND_API_KEY',
            'FROM_EMAIL',
            'FRONTEND_URL',
            'API_URL',
            'CORS_ORIGINS',
            'ALLOW_LOCALHOST_CORS',
            'SENTRY_DSN',
            'LOG_LEVEL',
            'POSTHOG_API_KEY',
            'REDIS_URL',
            'API_TIMEOUT',
            'DATABASE_QUERY_TIMEOUT',
            'CHECKOUT_SESSION_TIMEOUT',
            'RATE_LIMIT_WINDOW',
            'RATE_LIMIT_MAX_REQUESTS',
        ],
        development: [
            'ALLOW_LOCALHOST_CORS',
        ],
        production: [
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'RESEND_API_KEY',
        ],
        test: [
            'TEST_MODE',
        ]
    }; }
    static validate() {
        const env = process.env.NODE_ENV || 'development';
        const errors = [];
        const warnings = [];
        const info = [];
        for (const key of this.config.required) {
            if (!process.env[key]) {
                errors.push(`Missing required environment variable: ${key}`);
            }
        }
        if (env === 'production' && this.config.production) {
            for (const key of this.config.production) {
                if (!process.env[key]) {
                    errors.push(`Missing required production environment variable: ${key}`);
                }
            }
        }
        for (const key of this.config.optional) {
            if (!process.env[key]) {
                if (env === 'production' && this.config.production?.includes(key)) {
                    warnings.push(`Missing recommended environment variable for production: ${key}`);
                }
                else if (env === 'development') {
                    info.push(`Optional environment variable not set: ${key}`);
                }
            }
        }
        this.validateUrls(errors);
        this.validatePorts(errors);
        this.validateTimeouts(warnings);
        this.validateSecrets(errors, env);
        if (info.length > 0 && env === 'development') {
            this.logger.debug('Environment configuration info:');
            info.forEach(msg => this.logger.debug(`  ℹ️  ${msg}`));
        }
        if (warnings.length > 0) {
            this.logger.warn('Environment configuration warnings:');
            warnings.forEach(msg => this.logger.warn(`  ⚠️  ${msg}`));
        }
        if (errors.length > 0) {
            this.logger.error('Environment configuration errors:');
            errors.forEach(msg => this.logger.error(`  ❌ ${msg}`));
            if (env === 'production') {
                throw new Error('Environment validation failed. Please fix the errors above.');
            }
            else {
                this.logger.warn('Continuing despite errors (non-production environment)');
            }
        }
        else {
            this.logger.log('✅ Environment configuration validated successfully');
        }
        this.logEnvironmentSummary(env);
    }
    static validateUrls(errors) {
        const urlKeys = ['DATABASE_URL', 'SUPABASE_URL', 'FRONTEND_URL', 'API_URL', 'REDIS_URL'];
        for (const key of urlKeys) {
            const value = process.env[key];
            if (value && !this.isValidUrl(value)) {
                errors.push(`Invalid URL format for ${key}: ${value}`);
            }
        }
        if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
            errors.push('DATABASE_URL must be a PostgreSQL connection string');
        }
    }
    static validatePorts(errors) {
        const portKeys = ['PORT', 'FRONTEND_PORT'];
        for (const key of portKeys) {
            const value = process.env[key];
            if (value) {
                const port = parseInt(value, 10);
                if (isNaN(port) || port < 1 || port > 65535) {
                    errors.push(`Invalid port number for ${key}: ${value}`);
                }
            }
        }
    }
    static validateTimeouts(warnings) {
        const timeoutKeys = [
            'API_TIMEOUT',
            'DATABASE_QUERY_TIMEOUT',
            'CHECKOUT_SESSION_TIMEOUT',
            'WEBHOOK_PROCESSING_TIMEOUT'
        ];
        for (const key of timeoutKeys) {
            const value = process.env[key];
            if (value) {
                const timeout = parseInt(value, 10);
                if (isNaN(timeout) || timeout < 0) {
                    warnings.push(`Invalid timeout value for ${key}: ${value}`);
                }
                if (timeout > 60000) {
                    warnings.push(`Very high timeout value for ${key}: ${timeout}ms`);
                }
            }
        }
    }
    static validateSecrets(errors, env) {
        if (env !== 'production') {
            const secretKeys = [
                'SUPABASE_SERVICE_ROLE_KEY',
                'STRIPE_SECRET_KEY',
                'JWT_SECRET',
                'SUPABASE_JWT_SECRET'
            ];
            for (const key of secretKeys) {
                const value = process.env[key];
                if (value && (value.includes('your-') ||
                    value.includes('test-') ||
                    value.includes('example') ||
                    value === 'secret')) {
                    errors.push(`${key} appears to contain a placeholder value: ${value.substring(0, 20)}...`);
                }
            }
        }
        if (env === 'production') {
            if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
                errors.push('Using test Stripe key in production environment');
            }
        }
    }
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return url.startsWith('postgresql://') || url.startsWith('postgres://');
        }
    }
    static logEnvironmentSummary(env) {
        const summary = {
            environment: env,
            port: process.env.PORT || 'not set',
            database: process.env.DATABASE_URL ? '✓ configured' : '✗ not configured',
            supabase: process.env.SUPABASE_URL ? '✓ configured' : '✗ not configured',
            stripe: process.env.STRIPE_SECRET_KEY ? '✓ configured' : '✗ not configured',
            email: process.env.RESEND_API_KEY ? '✓ configured' : '✗ not configured',
            redis: process.env.REDIS_URL ? '✓ configured' : '✗ not configured',
            cors: process.env.CORS_ORIGINS ? '✓ configured' : '✗ using defaults',
        };
        this.logger.log('Environment Summary:');
        Object.entries(summary).forEach(([key, value]) => {
            this.logger.log(`  ${key}: ${value}`);
        });
    }
    static get(key, defaultValue) {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${key} is not defined`);
        }
        if (typeof defaultValue === 'number') {
            return parseInt(value, 10);
        }
        if (typeof defaultValue === 'boolean') {
            return (value === 'true');
        }
        return value;
    }
    static getRequired(key) {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Required environment variable ${key} is not defined`);
        }
        return value;
    }
    static getOptional(key, defaultValue) {
        return process.env[key] || defaultValue;
    }
    static getArray(key, defaultValue = []) {
        const value = process.env[key];
        if (!value)
            return defaultValue;
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }
}
exports.EnvValidator = EnvValidator;
