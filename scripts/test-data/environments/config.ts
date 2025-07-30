/**
 * Environment-Specific Configuration for Test Data Management
 * 
 * Defines data volumes, connection settings, and behaviors for different
 * testing environments to ensure appropriate data creation and cleanup.
 */

export interface EnvironmentConfig {
  name: string
  description: string
  defaultVolume: 'small' | 'medium' | 'large' | 'xl'
  database: {
    requireTestUrl: boolean
    allowProduction: boolean
    connectionTimeout: number
    queryTimeout: number
  }
  seeding: {
    maxParallelOperations: number
    batchSize: number
    enablePerformanceMonitoring: boolean
    enableVerboseLogging: boolean
  }
  cleanup: {
    requireConfirmation: boolean
    createBackup: boolean
    resetSequences: boolean
  }
  features: {
    enableStripeTestMode: boolean
    enableEmailCapture: boolean
    enableFileUploads: boolean
    enableWebhookSimulation: boolean
  }
  overrides?: {
    landlords?: number
    propertiesPerLandlord?: number
    unitsPerProperty?: number
    tenantsPerProperty?: number
    maintenancePercentage?: number
    stripeCustomers?: number
  }
  limits: {
    maxUsers: number
    maxProperties: number
    maxMaintenanceRequests: number
    maxFileSize: number
  }
}

export const config: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    description: 'Local development environment with moderate data volumes',
    defaultVolume: 'medium',
    database: {
      requireTestUrl: false,
      allowProduction: false,
      connectionTimeout: 10000,
      queryTimeout: 30000
    },
    seeding: {
      maxParallelOperations: 10,
      batchSize: 50,
      enablePerformanceMonitoring: true,
      enableVerboseLogging: true
    },
    cleanup: {
      requireConfirmation: true,
      createBackup: false,
      resetSequences: true
    },
    features: {
      enableStripeTestMode: true,
      enableEmailCapture: true,
      enableFileUploads: true,
      enableWebhookSimulation: true
    },
    limits: {
      maxUsers: 1000,
      maxProperties: 500,
      maxMaintenanceRequests: 2000,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    }
  },

  testing: {
    name: 'Testing',
    description: 'Automated test environment with minimal data for fast execution',
    defaultVolume: 'small',
    database: {
      requireTestUrl: true,
      allowProduction: false,
      connectionTimeout: 5000,
      queryTimeout: 15000
    },
    seeding: {
      maxParallelOperations: 5,
      batchSize: 20,
      enablePerformanceMonitoring: false,
      enableVerboseLogging: false
    },
    cleanup: {
      requireConfirmation: false,
      createBackup: false,
      resetSequences: true
    },
    features: {
      enableStripeTestMode: true,
      enableEmailCapture: false,
      enableFileUploads: false,
      enableWebhookSimulation: true
    },
    overrides: {
      landlords: 3,
      propertiesPerLandlord: 2,
      unitsPerProperty: 2,
      tenantsPerProperty: 1,
      maintenancePercentage: 0.3,
      stripeCustomers: 2
    },
    limits: {
      maxUsers: 100,
      maxProperties: 50,
      maxMaintenanceRequests: 100,
      maxFileSize: 1 * 1024 * 1024 // 1MB
    }
  },

  ci: {
    name: 'CI/CD',
    description: 'Continuous integration environment optimized for pipeline execution',
    defaultVolume: 'small',
    database: {
      requireTestUrl: true,
      allowProduction: false,
      connectionTimeout: 3000,
      queryTimeout: 10000
    },
    seeding: {
      maxParallelOperations: 3,
      batchSize: 10,
      enablePerformanceMonitoring: true,
      enableVerboseLogging: false
    },
    cleanup: {
      requireConfirmation: false,
      createBackup: false,
      resetSequences: true
    },
    features: {
      enableStripeTestMode: true,
      enableEmailCapture: false,
      enableFileUploads: false,
      enableWebhookSimulation: false
    },
    overrides: {
      landlords: 2,
      propertiesPerLandlord: 1,
      unitsPerProperty: 2,
      tenantsPerProperty: 1,
      maintenancePercentage: 0.2,
      stripeCustomers: 1
    },
    limits: {
      maxUsers: 50,
      maxProperties: 20,
      maxMaintenanceRequests: 50,
      maxFileSize: 512 * 1024 // 512KB
    }
  },

  local: {
    name: 'Local',
    description: 'Personal local environment with flexible configuration',
    defaultVolume: 'medium',
    database: {
      requireTestUrl: false,
      allowProduction: false,
      connectionTimeout: 15000,
      queryTimeout: 60000
    },
    seeding: {
      maxParallelOperations: 15,
      batchSize: 100,
      enablePerformanceMonitoring: true,
      enableVerboseLogging: true
    },
    cleanup: {
      requireConfirmation: true,
      createBackup: true,
      resetSequences: true
    },
    features: {
      enableStripeTestMode: true,
      enableEmailCapture: true,
      enableFileUploads: true,
      enableWebhookSimulation: true
    },
    limits: {
      maxUsers: 2000,
      maxProperties: 1000,
      maxMaintenanceRequests: 5000,
      maxFileSize: 50 * 1024 * 1024 // 50MB
    }
  },

  performance: {
    name: 'Performance Testing',
    description: 'High-volume data for performance and load testing',
    defaultVolume: 'xl',
    database: {
      requireTestUrl: true,
      allowProduction: false,
      connectionTimeout: 30000,
      queryTimeout: 120000
    },
    seeding: {
      maxParallelOperations: 20,
      batchSize: 200,
      enablePerformanceMonitoring: true,
      enableVerboseLogging: false
    },
    cleanup: {
      requireConfirmation: true,
      createBackup: true,
      resetSequences: true
    },
    features: {
      enableStripeTestMode: true,
      enableEmailCapture: false,
      enableFileUploads: true,
      enableWebhookSimulation: true
    },
    overrides: {
      landlords: 100,
      propertiesPerLandlord: 10,
      unitsPerProperty: 12,
      tenantsPerProperty: 8,
      maintenancePercentage: 0.9,
      stripeCustomers: 80
    },
    limits: {
      maxUsers: 10000,
      maxProperties: 5000,
      maxMaintenanceRequests: 25000,
      maxFileSize: 100 * 1024 * 1024 // 100MB
    }
  },

  e2e: {
    name: 'End-to-End Testing',
    description: 'Realistic data volumes for comprehensive E2E test scenarios',
    defaultVolume: 'medium',
    database: {
      requireTestUrl: true,
      allowProduction: false,
      connectionTimeout: 20000,
      queryTimeout: 45000
    },
    seeding: {
      maxParallelOperations: 8,
      batchSize: 40,
      enablePerformanceMonitoring: true,
      enableVerboseLogging: true
    },
    cleanup: {
      requireConfirmation: false,
      createBackup: false,
      resetSequences: true
    },
    features: {
      enableStripeTestMode: true,
      enableEmailCapture: true,
      enableFileUploads: true,
      enableWebhookSimulation: true
    },
    overrides: {
      landlords: 10,
      propertiesPerLandlord: 4,
      unitsPerProperty: 5,
      tenantsPerProperty: 4,
      maintenancePercentage: 0.6,
      stripeCustomers: 8
    },
    limits: {
      maxUsers: 500,
      maxProperties: 200,
      maxMaintenanceRequests: 1000,
      maxFileSize: 20 * 1024 * 1024 // 20MB
    }
  }
}

/**
 * Get configuration for the current environment
 */
export function getCurrentConfig(): EnvironmentConfig {
  const environment = process.env.TEST_ENV || process.env.NODE_ENV || 'development'
  return config[environment] || config.development
}

/**
 * Validate environment configuration
 */
export function validateConfig(envConfig: EnvironmentConfig): string[] {
  const errors: string[] = []

  // Validate database settings
  if (envConfig.database.connectionTimeout < 1000) {
    errors.push('Database connection timeout should be at least 1000ms')
  }

  if (envConfig.database.queryTimeout < envConfig.database.connectionTimeout) {
    errors.push('Query timeout should be greater than connection timeout')
  }

  // Validate seeding settings
  if (envConfig.seeding.maxParallelOperations < 1) {
    errors.push('Max parallel operations must be at least 1')
  }

  if (envConfig.seeding.batchSize < 1) {
    errors.push('Batch size must be at least 1')
  }

  // Validate limits
  if (envConfig.limits.maxUsers < 1) {
    errors.push('Max users must be at least 1')
  }

  if (envConfig.limits.maxFileSize < 1024) {
    errors.push('Max file size should be at least 1KB')
  }

  // Validate overrides if present
  if (envConfig.overrides) {
    if (envConfig.overrides.landlords && envConfig.overrides.landlords < 1) {
      errors.push('Landlord count override must be at least 1')
    }

    if (envConfig.overrides.maintenancePercentage && 
        (envConfig.overrides.maintenancePercentage < 0 || envConfig.overrides.maintenancePercentage > 1)) {
      errors.push('Maintenance percentage must be between 0 and 1')
    }
  }

  return errors
}

/**
 * Get database connection configuration
 */
export function getDatabaseConfig(envConfig: EnvironmentConfig) {
  return {
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    connectionTimeout: envConfig.database.connectionTimeout,
    queryTimeout: envConfig.database.queryTimeout,
    transactionOptions: {
      maxWait: 5000,
      timeout: envConfig.database.queryTimeout
    }
  }
}

/**
 * Environment-specific data generation strategies
 */
export const dataStrategies = {
  development: {
    userEmailDomains: ['example.com', 'test.com', 'dev.local'],
    propertyStates: ['TX', 'CA', 'NY', 'FL', 'WA'],
    maintenanceCategories: ['plumbing', 'electrical', 'hvac', 'appliances'],
    paymentMethods: ['online', 'check', 'cash', 'bank_transfer']
  },

  testing: {
    userEmailDomains: ['test.com'],
    propertyStates: ['TX', 'CA'],
    maintenanceCategories: ['plumbing', 'electrical'],
    paymentMethods: ['online', 'check']
  },

  ci: {
    userEmailDomains: ['ci.test'],
    propertyStates: ['TX'],
    maintenanceCategories: ['plumbing'],
    paymentMethods: ['online']
  },

  performance: {
    userEmailDomains: ['example.com', 'test.com', 'sample.org', 'demo.net'],
    propertyStates: ['TX', 'CA', 'NY', 'FL', 'WA', 'IL', 'PA', 'OH', 'GA', 'NC'],
    maintenanceCategories: ['plumbing', 'electrical', 'hvac', 'appliances', 'structural', 'exterior', 'safety', 'cosmetic'],
    paymentMethods: ['online', 'check', 'cash', 'bank_transfer', 'ach', 'credit_card']
  }
}

/**
 * Get data strategy for environment
 */
export function getDataStrategy(environment: string = 'development') {
  return dataStrategies[environment as keyof typeof dataStrategies] || dataStrategies.development
}