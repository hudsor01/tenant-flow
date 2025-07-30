/**
 * Optimized Multi-Tenant Database Configuration
 * 
 * Production-grade connection pooling and query optimization
 * for high-scale multi-tenant applications
 */

export const OptimizedMultiTenantConfig = {
  // Connection pool configuration for production scale
  connectionPool: {
    maxPoolSize: 100,               // Support 100+ concurrent tenants
    minPoolSize: 10,                // Maintain minimum connections
    acquireTimeoutMillis: 30000,    // 30s connection acquisition timeout
    createTimeoutMillis: 30000,     // 30s connection creation timeout
    destroyTimeoutMillis: 5000,     // 5s connection cleanup timeout
    idleTimeoutMillis: 1800000,     // 30min idle timeout (less aggressive)
    reapIntervalMillis: 300000,     // 5min cleanup interval
    createRetryIntervalMillis: 500  // 500ms retry interval
  },

  // Query optimization settings
  queryOptimization: {
    // Enable prepared statements for repeated queries
    enablePreparedStatements: true,
    
    // Query result caching (Redis integration)
    resultCaching: {
      enabled: true,
      defaultTTL: 300,              // 5 minutes default cache
      maxMemoryMB: 512,             // 512MB cache limit
      keyPrefix: 'tenantflow:query:',
      
      // Cache strategies by query type
      strategies: {
        propertyList: { ttl: 600, invalidateOn: ['property:update'] },
        tenantDetails: { ttl: 1800, invalidateOn: ['tenant:update'] },
        subscriptionStatus: { ttl: 300, invalidateOn: ['subscription:update'] },
        maintenanceRequests: { ttl: 180, invalidateOn: ['maintenance:update'] }
      }
    },

    // Query performance monitoring
    monitoring: {
      slowQueryThreshold: 1000,     // Log queries > 1s
      enableQueryLogging: true,
      logLevel: 'warn',
      sampleRate: 0.1               // Sample 10% of queries
    }
  },

  // Database read replica configuration
  readReplicas: {
    enabled: true,
    replicas: [
      { url: process.env.DATABASE_READ_REPLICA_1_URL, weight: 50 },
      { url: process.env.DATABASE_READ_REPLICA_2_URL, weight: 50 }
    ],
    // Route read queries to replicas
    routingStrategy: {
      writes: 'primary',
      reads: 'replica',
      analytics: 'replica'
    }
  },

  // Multi-tenant query optimization
  tenantOptimization: {
    // Tenant context caching
    contextCache: {
      enabled: true,
      ttl: 3600,                    // 1 hour context cache
      maxEntries: 1000              // Cache 1000 tenant contexts
    },

    // Connection warming for active tenants
    connectionWarming: {
      enabled: true,
      warmupThreshold: 100,         // Warm connections for tenants with 100+ queries/hour
      maxWarmConnections: 20        // Maximum pre-warmed connections
    }
  }
}

/**
 * Production database configuration with optimizations
 */
export const ProductionDatabaseConfig = {
  // Primary database configuration
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

  // Performance monitoring integration
  monitoring: {
    // Enable query performance tracking
    queryPerformance: {
      enabled: true,
      slowQueryThreshold: 500,      // 500ms threshold
      sampleRate: 1.0,              // Sample all queries in production
      exportToAPM: true             // Export to monitoring service
    },

    // Connection pool monitoring
    poolMonitoring: {
      enabled: true,
      metricsInterval: 30000,       // Report every 30s
      alertThresholds: {
        connectionUtilization: 0.8, // Alert at 80% utilization
        averageQueryTime: 1000,     // Alert if avg query > 1s
        errorRate: 0.01             // Alert if error rate > 1%
      }
    }
  },

  // Cache layer integration (Redis)
  cache: {
    redis: {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
      
      // Cluster configuration for high availability
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
}