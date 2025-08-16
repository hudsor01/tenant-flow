/**
 * Centralized queue configuration constants following official Bull patterns
 * Single source of truth for ALL queue settings - eliminates ALL duplication
 */

/**
 * Queue retry configurations following Bull best practices
 */
export const QUEUE_RETRY_CONFIGS = {
  EMAIL: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 10000 // 10 seconds base delay
    },
    removeOnComplete: true,
    removeOnFail: false
  },
  PAYMENT: {
    attempts: 3, // Conservative for financial operations
    backoff: {
      type: 'exponential' as const,
      delay: 5000 // 5 seconds base delay
    },
    removeOnComplete: true,
    removeOnFail: false // Keep for audit trail
  },
  REPORT: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000 // 2 seconds base delay
    },
    removeOnComplete: true,
    removeOnFail: false
  },
  DEFAULT: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000 // 2 seconds base delay
    },
    removeOnComplete: true,
    removeOnFail: false
  }
} as const

/**
 * Queue processing delays for simulations
 */
export const QUEUE_PROCESSING_DELAYS = {
  EMAIL: 1000,      // 1 second
  PAYMENT: 2000,    // 2 seconds for financial operations
  REPORT: 3000,     // 3 seconds for report generation
  DEFAULT: 1000     // 1 second default
} as const

/**
 * Queue priority levels
 */
export const QUEUE_PRIORITY = {
  CRITICAL: 1,    // Highest priority (lower number = higher priority)
  HIGH: 5,
  NORMAL: 10,
  LOW: 20,
  BATCH: 100      // Lowest priority for batch operations
} as const

/**
 * Queue concurrency settings
 */
export const QUEUE_CONCURRENCY = {
  EMAIL: 5,       // Process 5 emails simultaneously
  PAYMENT: 2,     // Conservative concurrency for payments
  REPORT: 3,      // Moderate concurrency for reports
  DEFAULT: 5      // Default concurrency
} as const

/**
 * Queue rate limiting settings
 */
export const QUEUE_RATE_LIMITS = {
  EMAIL: {
    max: 100,           // 100 emails
    duration: 60000     // per minute
  },
  PAYMENT: {
    max: 10,            // 10 payment operations
    duration: 60000     // per minute (conservative)
  },
  REPORT: {
    max: 20,            // 20 reports
    duration: 60000     // per minute
  },
  DEFAULT: {
    max: 50,            // 50 operations
    duration: 60000     // per minute
  }
} as const

/**
 * Queue job types
 */
export const QUEUE_JOB_TYPES = {
  EMAIL: {
    SEND: 'send-email',
    WELCOME: 'welcome-email',
    NOTIFICATION: 'notification-email',
    BATCH: 'batch-email'
  },
  PAYMENT: {
    CHARGE: 'charge',
    REFUND: 'refund',
    SUBSCRIPTION: 'subscription',
    INVOICE: 'invoice'
  },
  REPORT: {
    GENERATE: 'generate-report',
    EXPORT: 'export-report',
    SCHEDULE: 'schedule-report'
  }
} as const

/**
 * Queue error thresholds for escalation
 */
export const QUEUE_ERROR_THRESHOLDS = {
  ESCALATION_ATTEMPTS: 3,      // Escalate after 3 failed attempts
  CRITICAL_ERROR_COUNT: 10,    // Alert if 10 errors in a window
  ERROR_WINDOW_MS: 300000      // 5 minute error counting window
} as const

/**
 * Queue monitoring settings
 */
export const QUEUE_MONITORING = {
  HEALTH_CHECK_INTERVAL: 30000,    // Check queue health every 30s
  STALLED_JOB_INTERVAL: 60000,     // Check for stalled jobs every minute
  METRICS_COLLECTION_INTERVAL: 10000, // Collect metrics every 10s
  JOB_RETENTION_COMPLETED: 100,    // Keep last 100 completed jobs
  JOB_RETENTION_FAILED: 1000       // Keep last 1000 failed jobs for debugging
} as const

/**
 * Common queue names used throughout the application
 */
export const QUEUE_NAMES = {
  EMAIL: 'email',
  PAYMENT: 'payments',
  REPORT: 'reports',
  NOTIFICATION: 'notifications',
  EXPORT: 'exports',
  IMPORT: 'imports'
} as const

/**
 * Queue Redis connection settings
 */
export const QUEUE_REDIS_OPTIONS = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
} as const