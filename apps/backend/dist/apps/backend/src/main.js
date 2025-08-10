"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const logger_config_1 = require("./common/logging/logger.config");
const winston_config_1 = require("./common/config/winston.config");
const fastify_request_logger_service_1 = require("./common/logging/fastify-request-logger.service");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const swagger_1 = require("@nestjs/swagger");
const dotenv_flow_1 = __importDefault(require("dotenv-flow"));
const security_utils_1 = require("./common/security/security.utils");
const helmet_1 = __importDefault(require("@fastify/helmet"));
const nest_winston_1 = require("nest-winston");
const env_validator_1 = require("./config/env-validator");
if (process.env.NODE_ENV !== 'production') {
    dotenv_flow_1.default.config({
        path: process.cwd()
    });
}
env_validator_1.EnvValidator.validate();
async function bootstrap() {
    const bootstrapStartTime = Date.now();
    const winstonLogger = (0, winston_config_1.createLogger)();
    class LoggerAdapter {
        log(message, context) {
            winstonLogger.info(message, context);
        }
        error(message, context) {
            winstonLogger.error(message, context);
        }
        warn(message, context) {
            winstonLogger.warn(message, context);
        }
        debug(message, context) {
            winstonLogger.debug(message, context);
        }
    }
    const logger = new LoggerAdapter();
    const logDebug = (message, context) => {
        if ('debug' in logger && typeof logger.debug === 'function') {
            logger.debug(message, context);
        }
    };
    const bootstrapPerfLogger = new logger_config_1.PerformanceLogger(logger, 'bootstrap', {
        environment: process.env.NODE_ENV,
        port: process.env.PORT
    });
    logger.log('🚀 Bootstrap starting', {
        environment: process.env.NODE_ENV,
        port: process.env.PORT,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
    });
    const fastifyOptions = {
        bodyLimit: 10 * 1024 * 1024,
        maxParamLength: 200,
        trustProxy: true,
        logger: false,
        keepAliveTimeout: 30000,
        connectionTimeout: 10000,
        requestTimeout: 9000,
    };
    logDebug('Fastify configuration', {
        bodyLimit: fastifyOptions.bodyLimit,
        trustProxy: fastifyOptions.trustProxy,
        keepAliveTimeout: fastifyOptions.keepAliveTimeout,
        connectionTimeout: fastifyOptions.connectionTimeout,
        requestTimeout: fastifyOptions.requestTimeout
    });
    const appCreationPerfLogger = new logger_config_1.PerformanceLogger(logger, 'nestjs-application-creation');
    const createTimeout = setTimeout(() => {
        logger.error('NestFactory.create() taking longer than 15 seconds - possible hang detected', {
            operation: 'nestjs-application-creation',
            phase: 'timeout-warning',
            duration: 15000,
            suggestions: [
                'Check for missing environment variables',
                'Look for circular dependencies',
                'Review blocking constructors in modules'
            ]
        });
    }, 15000);
    const aggressiveTimeout = setTimeout(() => {
        logger.error('CRITICAL: NestFactory.create() hung for 30+ seconds!', {
            operation: 'nestjs-application-creation',
            phase: 'critical-timeout',
            duration: 30000,
            action: 'forcing-process-exit'
        });
        process.exit(1);
    }, 30000);
    logDebug('Creating Fastify adapter', { phase: 'adapter-creation' });
    const fastifyAdapter = new platform_fastify_1.FastifyAdapter(fastifyOptions);
    const moduleLoadStartTime = Date.now();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, fastifyAdapter, {
        bodyParser: false,
        logger: nest_winston_1.WinstonModule.createLogger({
            instance: winstonLogger,
        }),
    });
    const moduleLoadTime = Date.now() - moduleLoadStartTime;
    clearTimeout(aggressiveTimeout);
    clearTimeout(createTimeout);
    appCreationPerfLogger.complete({ moduleLoadTime });
    logger.log('NestJS application created successfully', {
        moduleLoadTime,
        phase: 'application-created'
    });
    logDebug('Obtaining ConfigService', { phase: 'service-initialization' });
    const configService = app.get(config_1.ConfigService);
    logDebug('Creating SecurityUtils', { phase: 'security-initialization' });
    const securityUtils = new security_utils_1.SecurityUtils();
    logDebug('Retrieving JWT secret configuration', { phase: 'jwt-configuration' });
    const jwtSecret = configService.get('JWT_SECRET');
    const securityLogger = new common_1.Logger('Security');
    logDebug('Starting security validation', { phase: 'security-assessment' });
    if (jwtSecret) {
        const validation = securityUtils.validateJwtSecret(jwtSecret);
        if (validation.errors.length > 0) {
            securityLogger.error('❌ JWT_SECRET critical issues:');
            validation.errors.forEach(error => securityLogger.error(`  - ${error}`));
            if (validation.suggestions.length > 0) {
                securityLogger.error('💡 Suggestions:');
                validation.suggestions.forEach(suggestion => securityLogger.error(`  - ${suggestion}`));
            }
            if (!validation.canProceed) {
                if (configService.get('NODE_ENV') === 'production') {
                    throw new Error('JWT_SECRET is too short - minimum 32 characters required for security');
                }
                else {
                    securityLogger.error('🚫 JWT_SECRET too short - system may be unstable');
                }
            }
        }
        if (validation.warnings.length > 0) {
            securityLogger.warn('⚠️  JWT_SECRET security recommendations:');
            validation.warnings.forEach(warning => securityLogger.warn(`  - ${warning}`));
            if (validation.suggestions.length > 0) {
                securityLogger.warn('💡 Suggestions for better security:');
                validation.suggestions.forEach(suggestion => securityLogger.warn(`  - ${suggestion}`));
            }
            if (configService.get('NODE_ENV') === 'production') {
                securityLogger.warn('🔒 Consider updating JWT_SECRET for production security');
            }
        }
        if (validation.valid) {
            securityLogger.log('✅ JWT_SECRET meets all security requirements');
        }
    }
    else {
        securityLogger.error('❌ JWT_SECRET is not configured');
        throw new Error('JWT_SECRET environment variable is required');
    }
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true
        },
        errorHttpStatusCode: 400,
        exceptionFactory: (errors) => {
            const messages = errors.map(err => ({
                field: err.property,
                errors: Object.values(err.constraints || {}),
                value: err.value
            }));
            return new common_1.BadRequestException({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    statusCode: 400,
                    details: messages
                }
            });
        }
    }));
    const environment = configService.get('NODE_ENV') || 'development';
    const isProduction = environment === 'production';
    const validEnvironments = ['development', 'test', 'production'];
    if (!validEnvironments.includes(environment)) {
        throw new Error(`Invalid NODE_ENV: ${environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }
    const corsOrigins = configService.get('cors.origins') || [];
    logDebug('CORS origins configured', { corsOrigins });
    const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/;
    corsOrigins.forEach(origin => {
        if (!validOriginPattern.test(origin)) {
            throw new Error(`Invalid CORS origin format: ${origin}. Origins must be valid URLs.`);
        }
    });
    let finalCorsOrigins = corsOrigins;
    if (corsOrigins.length === 0) {
        if (isProduction) {
            finalCorsOrigins = [
                'https://tenantflow.app',
                'https://www.tenantflow.app',
                'https://blog.tenantflow.app',
            ];
        }
        else {
            finalCorsOrigins = [
                'https://tenantflow.app',
                'https://www.tenantflow.app',
                'https://blog.tenantflow.app',
            ];
            if (environment === 'development' || environment === 'test') {
                const allowLocalhost = configService.get('ALLOW_LOCALHOST_CORS');
                if (allowLocalhost === 'true') {
                    finalCorsOrigins.push('http://localhost:5172', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004');
                }
            }
        }
    }
    if (isProduction) {
        const httpOrigins = finalCorsOrigins.filter(origin => origin.startsWith('http://'));
        if (httpOrigins.length > 0) {
            throw new Error(`Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`);
        }
    }
    logger.log('CORS configuration finalized', {
        environment,
        originCount: finalCorsOrigins.length,
        origins: isProduction ? '[hidden-for-security]' : finalCorsOrigins
    });
    app.enableCors({
        origin: finalCorsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'Cache-Control'
        ]
    });
    app.setGlobalPrefix('api/v1', {
        exclude: ['/health', '/ping', '/']
    });
    const appInitPerfLogger = new logger_config_1.PerformanceLogger(logger, 'application-initialization');
    const initTimeout = setTimeout(() => {
        logger.error('app.init() taking longer than 10 seconds - possible hang detected', {
            operation: 'application-initialization',
            phase: 'timeout-warning',
            duration: 10000,
            suggestions: [
                'Check PrismaService onModuleInit()',
                'Review StripeCheckoutService initialization',
                'Look for hanging HTTP requests in service constructors'
            ]
        });
    }, 10000);
    try {
        logDebug('Calling app.init()', { phase: 'initialization-start' });
        await app.init();
        clearTimeout(initTimeout);
        appInitPerfLogger.complete();
    }
    catch (error) {
        clearTimeout(initTimeout);
        appInitPerfLogger.error(error);
        logger.error('Application initialization failed', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error
        });
        throw error;
    }
    logger.log('NestJS application initialized successfully', { phase: 'initialization-complete' });
    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, rawBody, done) => {
        if (req.url === '/api/v1/stripe/webhook') {
            req.rawBody = rawBody;
            try {
                const json = JSON.parse(rawBody.toString('utf8'));
                done(null, json);
            }
            catch (err) {
                done(err);
            }
        }
        else {
            try {
                const json = JSON.parse(rawBody.toString('utf8'));
                done(null, json);
            }
            catch (err) {
                done(err);
            }
        }
    });
    logger.log('✅ Raw body parsing configured for Stripe webhook endpoint');
    await app.register(helmet_1.default, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: isProduction ?
                    ["'self'", "https://js.stripe.com"] :
                    ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: [
                    "'self'",
                    "https://api.stripe.com",
                    "wss://api.stripe.com",
                    ...(isProduction ? [] : ["http://localhost:*", "ws://localhost:*"])
                ],
                fontSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
                baseUri: ["'self'"],
                manifestSrc: ["'self'"],
                workerSrc: ["'self'"],
                upgradeInsecureRequests: isProduction ? [] : null
            }
        },
        hsts: isProduction ? {
            maxAge: 63072000,
            includeSubDomains: true,
            preload: true
        } : false,
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        ieNoOpen: true,
        frameguard: { action: 'deny' },
        dnsPrefetchControl: { allow: false },
        permittedCrossDomainPolicies: false,
        hidePoweredBy: true,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: isProduction ? 'same-origin' : 'unsafe-none' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        originAgentCluster: true,
    });
    logger.log('✅ Security headers configured');
    try {
        const requestLoggerService = app.get(fastify_request_logger_service_1.FastifyRequestLoggerService);
        requestLoggerService.registerHooks(fastifyInstance);
        logger.log('Fastify request logging hooks registered successfully', {
            phase: 'hooks-configuration'
        });
    }
    catch (error) {
        logger.warn('Failed to register request logging hooks', {
            error: error instanceof Error ? error.message : 'Unknown error',
            phase: 'hooks-configuration'
        });
    }
    const config = new swagger_1.DocumentBuilder()
        .setTitle('TenantFlow API')
        .setDescription('API documentation')
        .setVersion('1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = parseInt(process.env.PORT || '4600', 10);
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', {
            promise: String(promise),
            reason: reason instanceof Error ? {
                message: reason.message,
                stack: reason.stack,
                name: reason.name
            } : reason
        });
    });
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error
        });
        process.exit(1);
    });
    try {
        const serverStartupPerfLogger = new logger_config_1.PerformanceLogger(logger, 'server-startup', {
            port,
            environment: process.env.NODE_ENV
        });
        serverStartupPerfLogger.complete({ port, started: true });
        logger.log('Starting server', {
            port,
            configuredPort: process.env.PORT,
            environment: process.env.NODE_ENV,
            host: '0.0.0.0'
        });
        const listenStartTime = Date.now();
        await app.listen(port, '0.0.0.0');
        const listenTime = Date.now() - listenStartTime;
        const totalBootstrapTime = Date.now() - bootstrapStartTime;
        bootstrapPerfLogger.complete({
            port,
            totalBootstrapTime,
            performanceBreakdown: {
                moduleLoad: moduleLoadTime,
                appInit: Date.now() - moduleLoadStartTime,
                serverListen: listenTime,
                total: totalBootstrapTime
            }
        });
        logger.log('Server startup completed', {
            port,
            host: '0.0.0.0',
            performanceSummary: {
                moduleLoadTime: `${moduleLoadTime}ms`,
                listenTime: `${listenTime}ms`,
                totalBootstrapTime: `${totalBootstrapTime}ms`
            }
        });
        (0, logger_config_1.setRunningPort)(port);
        let healthCheckPassed = true;
        if (process.env.NODE_ENV !== 'production') {
            const healthUrls = [
                `http://0.0.0.0:${port}/health`,
                `http://0.0.0.0:${port}/`
            ];
            healthCheckPassed = false;
            const healthCheckPerfLogger = new logger_config_1.PerformanceLogger(logger, 'health-check-validation');
            for (const url of healthUrls) {
                try {
                    const testResponse = await fetch(url, {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' }
                    }).catch(() => null);
                    if (testResponse) {
                        logDebug('Health check response received', {
                            url,
                            status: testResponse.status,
                            statusText: testResponse.statusText
                        });
                        if (testResponse.ok) {
                            healthCheckPassed = true;
                            const responseText = await testResponse.text().catch(() => 'No response body');
                            logger.log('Health check endpoint accessible', {
                                url,
                                status: testResponse.status,
                                responsePreview: responseText.substring(0, 100)
                            });
                        }
                    }
                    else {
                        logger.warn('No response from health check endpoint', { url });
                    }
                }
                catch (error) {
                    logger.warn('Health check failed for endpoint', {
                        url,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            if (!healthCheckPassed) {
                logger.error('All health checks failed - server may not be accessible');
                try {
                    const fastifyInstance = app.getHttpAdapter().getInstance();
                    logDebug('Fastify server diagnostic info', {
                        listening: fastifyInstance.server?.listening,
                        address: fastifyInstance.server?.address(),
                    });
                }
                catch (error) {
                    logger.error('Failed to retrieve Fastify diagnostic info', { error });
                }
            }
            else {
                healthCheckPerfLogger.complete({ healthCheckPassed });
            }
        }
        else {
            logger.log('Skipping health check in production environment');
        }
        if (isProduction) {
            logger.log('TenantFlow API Server connected successfully', {
                port,
                environment: 'production',
                healthCheckPassed
            });
        }
        else {
            const baseUrl = `http://localhost:${port}`;
            logger.log('TenantFlow API Server running in development mode', {
                baseUrl,
                port,
                environment,
                endpoints: {
                    api: `${baseUrl}/api/v1`,
                    docs: `${baseUrl}/api/docs`,
                    health: `${baseUrl}/health`
                },
                authentication: 'Supabase Hybrid Mode',
                corsOrigins: finalCorsOrigins,
                healthCheckPassed
            });
        }
    }
    catch (error) {
        bootstrapPerfLogger.error(error);
        logger.error('Failed to start server', {
            port,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error?.code,
                errno: error?.errno,
                syscall: error?.syscall,
                address: error?.address,
                port: error?.port
            } : error
        });
        throw error;
    }
}
bootstrap().catch(error => {
    console.error('FATAL: Bootstrap failed:', error);
    process.exit(1);
});
