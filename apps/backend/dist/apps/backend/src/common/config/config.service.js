"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TypeSafeConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeSafeConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_schema_1 = require("./config.schema");
let TypeSafeConfigService = TypeSafeConfigService_1 = class TypeSafeConfigService {
    constructor() {
        this.logger = new common_1.Logger(TypeSafeConfigService_1.name);
        this._validatedConfig = null;
        this._derivedConfig = null;
        this.validateConfiguration();
    }
    validateConfiguration() {
        try {
            this.logger.log('🔍 Validating environment configuration...');
            const rawConfig = process.env;
            const validationResult = config_schema_1.configSchema.safeParse(rawConfig);
            if (!validationResult.success) {
                this.logger.error('❌ Configuration validation failed:');
                const errorMessages = validationResult.error.issues.map((error) => {
                    const path = error.path.join('.');
                    return `  • ${path}: ${error.message}`;
                });
                const errorMessage = `Environment configuration is invalid:\n${errorMessages.join('\n')}`;
                this.logger.error(errorMessage);
                if (process.env.NODE_ENV === 'production') {
                    throw new Error(`Critical configuration validation failed:\n${errorMessage}`);
                }
                else {
                    this.logger.warn('🚧 Running in development mode with invalid configuration');
                    throw new Error(`Configuration validation failed:\n${errorMessage}`);
                }
            }
            this._validatedConfig = validationResult.data;
            this._derivedConfig = (0, config_schema_1.createDerivedConfig)(validationResult.data);
            this.logger.log('✅ Environment configuration validated successfully');
            this.logConfigurationSummary();
        }
        catch (error) {
            this.logger.error('Failed to validate configuration:', error);
            throw error;
        }
    }
    logConfigurationSummary() {
        if (!this._derivedConfig)
            return;
        const config = this._derivedConfig;
        const summary = {
            environment: config.app.nodeEnv,
            port: config.app.port,
            database: {
                maxConnections: config.database.maxConnections,
                connectionTimeout: config.database.connectionTimeout
            },
            cors: {
                originsCount: config.cors.origins.length
            },
            rateLimit: {
                enabled: config.app.enableRateLimiting,
                ttl: config.rateLimit.ttl,
                limit: config.rateLimit.limit
            },
            features: {
                swagger: config.app.enableSwagger,
                metrics: config.app.enableMetrics,
                stripe: !!config.stripe.secretKey,
                redis: !!config.redis.url,
                email: !!config.email.smtp.host
            },
            storage: {
                provider: config.storage.provider,
                bucket: config.storage.bucket
            }
        };
        this.logger.log('📋 Configuration Summary:', JSON.stringify(summary, null, 2));
    }
    get config() {
        if (!this._validatedConfig) {
            throw new Error('Configuration not validated. This should not happen.');
        }
        return this._validatedConfig;
    }
    get derived() {
        if (!this._derivedConfig) {
            throw new Error('Derived configuration not available. This should not happen.');
        }
        return this._derivedConfig;
    }
    get(key) {
        return this.config[key];
    }
    getOrDefault(key, defaultValue) {
        const value = this.config[key];
        return value !== undefined ? value : defaultValue;
    }
    get isProduction() {
        return this.config.NODE_ENV === 'production';
    }
    get isDevelopment() {
        return this.config.NODE_ENV === 'development';
    }
    get isTest() {
        return this.config.NODE_ENV === 'test';
    }
    get database() {
        return this.derived.database;
    }
    get supabase() {
        return this.derived.supabase;
    }
    get jwt() {
        return this.derived.jwt;
    }
    get cors() {
        return this.derived.cors;
    }
    get rateLimit() {
        return this.derived.rateLimit;
    }
    get stripe() {
        return this.derived.stripe;
    }
    get redis() {
        return this.derived.redis;
    }
    get app() {
        return this.derived.app;
    }
    get storage() {
        return this.derived.storage;
    }
    get email() {
        return this.derived.email;
    }
    get security() {
        return this.derived.security;
    }
    validateConfigUpdate(updates) {
        try {
            const currentConfig = { ...process.env, ...updates };
            const result = config_schema_1.configSchema.safeParse(currentConfig);
            if (!result.success) {
                this.logger.warn('Configuration update validation failed:', result.error.issues);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error('Error validating configuration update:', error);
            return false;
        }
    }
    getFeatureConfig(feature) {
        const featureConfig = this.derived[feature];
        if (!featureConfig) {
            throw new Error(`Feature configuration '${String(feature)}' is not available`);
        }
        return featureConfig;
    }
    isFeatureEnabled(feature) {
        switch (feature) {
            case 'swagger':
                return this.app.enableSwagger;
            case 'metrics':
                return this.app.enableMetrics;
            case 'rateLimiting':
                return this.app.enableRateLimiting;
            default:
                return false;
        }
    }
    getEnvironmentConfig() {
        return {
            isProduction: this.isProduction,
            isDevelopment: this.isDevelopment,
            isTest: this.isTest,
            nodeEnv: this.config.NODE_ENV,
            port: this.config.PORT,
            logLevel: this.config.LOG_LEVEL
        };
    }
};
exports.TypeSafeConfigService = TypeSafeConfigService;
exports.TypeSafeConfigService = TypeSafeConfigService = TypeSafeConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TypeSafeConfigService);
