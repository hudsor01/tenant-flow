/**
 * Multi-Tenant Database Configuration
 *
 * Production-grade connection pooling and query optimization
 * for high-scale multi-tenant applications
 */

export const MultiTenantConfig = {
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

	// Query optimization settings
	queryOptimization: {
		// Enable prepared statements for repeated queries
		enablePreparedStatements: true,

		// Query result caching (Redis integration)
		resultCaching: {
			enabled: true,
			defaultTTL: 300,
			maxMemoryMB: 512,
			keyPrefix: 'tenantflow:query:',

			// Cache strategies by query type
			strategies: {
				propertyList: { ttl: 600, invalidateOn: ['property:update'] },
				tenantDetails: { ttl: 1800, invalidateOn: ['tenant:update'] },
				subscriptionStatus: {
					ttl: 300,
					invalidateOn: ['subscription:update']
				},
				maintenanceRequests: {
					ttl: 180,
					invalidateOn: ['maintenance:update']
				}
			}
		},

		// Query performance monitoring
		monitoring: {
			slowQueryThreshold: 1000,
			enableQueryLogging: true,
			logLevel: 'warn',
			sampleRate: 0.1
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
			ttl: 3600,
			maxEntries: 1000
		},

		// Connection warming for active tenants
		connectionWarming: {
			enabled: true,
			warmupThreshold: 100,
			maxWarmConnections: 20
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
			slowQueryThreshold: 500,
			sampleRate: 1.0,
			exportToAPM: true
		},

		// Connection pool monitoring
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
