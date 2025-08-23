/**
 * Performance monitoring configuration
 * Configures metrics, tracing, and performance optimizations
 */

export const performanceConfig = {
	// Response time thresholds (ms)
	thresholds: {
		api: {
			p50: 100, // 50th percentile target
			p95: 300, // 95th percentile target
			p99: 500 // 99th percentile target
		},
		database: {
			query: 50,
			transaction: 200
		}
	},

	// Memory limits (MB)
	memory: {
		heapUsed: {
			warning: 200,
			critical: 300
		},
		rss: {
			warning: 400,
			critical: 512
		}
	},

	// Rate limiting
	rateLimiting: {
		windowMs: 60 * 1000, // 1 minute
		max: 100, // requests per window
		standardHeaders: true,
		legacyHeaders: false
	},

	// Request/Response optimizations
	optimization: {
		compression: {
			level: 6, // 1-9, higher = better compression, more CPU
			threshold: 1024 // bytes
		},
		caching: {
			staticAssets: 31536000, // 1 year in seconds
			apiResponses: 60 // 1 minute default
		}
	},

	// Monitoring intervals (ms)
	monitoring: {
		metricsInterval: 30000, // 30 seconds
		healthCheckInterval: 20000, // 20 seconds
		gcStatsInterval: 60000 // 1 minute
	},

	// Circuit breaker settings
	circuitBreaker: {
		timeout: 3000, // ms
		errorThresholdPercentage: 50,
		resetTimeout: 30000, // ms
		volumeThreshold: 10 // minimum requests before opening
	},

	// Connection pooling
	connectionPool: {
		database: {
			min: 2,
			max: 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
		}
	}
} as const

export type PerformanceConfig = typeof performanceConfig