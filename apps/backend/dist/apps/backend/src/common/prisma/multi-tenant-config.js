"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionDatabaseConfig = exports.MultiTenantConfig = void 0;
exports.MultiTenantConfig = {
    connectionPool: {
        maxPoolSize: 100,
        minPoolSize: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 1800000,
        reapIntervalMillis: 300000,
        createRetryIntervalMillis: 500
    },
    queryOptimization: {
        enablePreparedStatements: true,
        resultCaching: {
            enabled: true,
            defaultTTL: 300,
            maxMemoryMB: 512,
            keyPrefix: 'tenantflow:query:',
            strategies: {
                propertyList: { ttl: 600, invalidateOn: ['property:update'] },
                tenantDetails: { ttl: 1800, invalidateOn: ['tenant:update'] },
                subscriptionStatus: { ttl: 300, invalidateOn: ['subscription:update'] },
                maintenanceRequests: { ttl: 180, invalidateOn: ['maintenance:update'] }
            }
        },
        monitoring: {
            slowQueryThreshold: 1000,
            enableQueryLogging: true,
            logLevel: 'warn',
            sampleRate: 0.1
        }
    },
    readReplicas: {
        enabled: true,
        replicas: [
            { url: process.env.DATABASE_READ_REPLICA_1_URL, weight: 50 },
            { url: process.env.DATABASE_READ_REPLICA_2_URL, weight: 50 }
        ],
        routingStrategy: {
            writes: 'primary',
            reads: 'replica',
            analytics: 'replica'
        }
    },
    tenantOptimization: {
        contextCache: {
            enabled: true,
            ttl: 3600,
            maxEntries: 1000
        },
        connectionWarming: {
            enabled: true,
            warmupThreshold: 100,
            maxWarmConnections: 20
        }
    }
};
exports.ProductionDatabaseConfig = {
    primary: {
        url: process.env.DATABASE_URL,
        connectionLimit: 50,
        poolTimeout: 30000,
        ssl: {
            rejectUnauthorized: true,
            cert: process.env.DATABASE_SSL_CERT,
            key: process.env.DATABASE_SSL_KEY,
            ca: process.env.DATABASE_SSL_CA
        }
    },
    monitoring: {
        queryPerformance: {
            enabled: true,
            slowQueryThreshold: 500,
            sampleRate: 1.0,
            exportToAPM: true
        },
        poolMonitoring: {
            enabled: true,
            metricsInterval: 30000,
            alertThresholds: {
                connectionUtilization: 0.8,
                averageQueryTime: 1000,
                errorRate: 0.01
            }
        }
    },
    cache: {
        redis: {
            url: process.env.REDIS_URL,
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            lazyConnect: true,
            keepAlive: 30000,
            cluster: {
                enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
                nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
                options: {
                    redisOptions: {
                        password: process.env.REDIS_PASSWORD
                    }
                }
            }
        }
    }
};
