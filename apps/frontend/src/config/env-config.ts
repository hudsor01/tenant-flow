/**
 * Frontend Environment Configuration
 * Centralized configuration management for all environment variables
 */

interface FrontendConfig {
  // Application
  appUrl: string
  apiUrl: string
  environment: 'development' | 'staging' | 'production' | 'test'
  
  // Supabase
  supabase: {
    url: string
    anonKey: string
  }
  
  // Stripe
  stripe: {
    publishableKey: string
  }
  
  // Analytics
  analytics: {
    posthogKey?: string
    posthogHost?: string
    gaId?: string
  }
  
  // Feature Flags
  features: {
    tenantPortal: boolean
    maintenanceModule: boolean
    paymentProcessing: boolean
    emailNotifications: boolean
    betaFeatures: boolean
  }
  
  // Performance
  timeouts: {
    api: number
    checkout: number
    notification: number
  }
}

class EnvConfig {
  private static instance: EnvConfig
  private config: FrontendConfig

  private constructor() {
    this.config = this.loadConfig()
    this.validateConfig()
  }

  static getInstance(): EnvConfig {
    if (!EnvConfig.instance) {
      EnvConfig.instance = new EnvConfig()
    }
    return EnvConfig.instance
  }

  private loadConfig(): FrontendConfig {
    const env = typeof window !== 'undefined' ? window.process?.env : process.env

    return {
      // Application
      appUrl: env?.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      apiUrl: env?.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api',
      environment: (env?.NODE_ENV as any) || 'development',
      
      // Supabase
      supabase: {
        url: env?.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      
      // Stripe
      stripe: {
        publishableKey: env?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      },
      
      // Analytics
      analytics: {
        posthogKey: env?.NEXT_PUBLIC_POSTHOG_KEY,
        posthogHost: env?.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        gaId: env?.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      },
      
      // Feature Flags
      features: {
        tenantPortal: env?.NEXT_PUBLIC_ENABLE_TENANT_PORTAL !== 'false',
        maintenanceModule: env?.NEXT_PUBLIC_ENABLE_MAINTENANCE !== 'false',
        paymentProcessing: env?.NEXT_PUBLIC_ENABLE_PAYMENTS !== 'false',
        emailNotifications: env?.NEXT_PUBLIC_ENABLE_EMAIL !== 'false',
        betaFeatures: env?.NEXT_PUBLIC_ENABLE_BETA === 'true',
      },
      
      // Performance
      timeouts: {
        api: parseInt(env?.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
        checkout: parseInt(env?.NEXT_PUBLIC_CHECKOUT_TIMEOUT || '8000', 10),
        notification: parseInt(env?.NEXT_PUBLIC_NOTIFICATION_TIMEOUT || '8000', 10),
      },
    }
  }

  private validateConfig(): void {
    const errors: string[] = []
    const warnings: string[] = []

    // Required in production
    if (this.config.environment === 'production') {
      if (!this.config.supabase.url) {
        errors.push('NEXT_PUBLIC_SUPABASE_URL is required in production')
      }
      if (!this.config.supabase.anonKey) {
        errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required in production')
      }
      if (!this.config.stripe.publishableKey) {
        errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required in production')
      }
      if (!this.config.appUrl || this.config.appUrl.includes('localhost')) {
        errors.push('NEXT_PUBLIC_APP_URL must be a production URL')
      }
      if (!this.config.apiUrl || this.config.apiUrl.includes('localhost')) {
        errors.push('NEXT_PUBLIC_API_URL must be a production URL')
      }
    }

    // Warnings for missing optional configs
    if (!this.config.analytics.posthogKey && this.config.environment === 'production') {
      warnings.push('PostHog analytics not configured')
    }
    if (!this.config.analytics.gaId && this.config.environment === 'production') {
      warnings.push('Google Analytics not configured')
    }

    // Log validation results
    if (errors.length > 0) {
      console.error('❌ Environment configuration errors:', errors)
      if (this.config.environment === 'production') {
        throw new Error('Environment validation failed')
      }
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Environment configuration warnings:', warnings)
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Environment configuration validated')
    }
  }

  get<K extends keyof FrontendConfig>(key: K): FrontendConfig[K] {
    return this.config[key]
  }

  getAll(): Readonly<FrontendConfig> {
    return Object.freeze({ ...this.config })
  }

  isProduction(): boolean {
    return this.config.environment === 'production'
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development'
  }

  isFeatureEnabled(feature: keyof FrontendConfig['features']): boolean {
    return this.config.features[feature]
  }

  getApiEndpoint(path: string): string {
    const baseUrl = this.config.apiUrl.replace(/\/+$/, '')
    const cleanPath = path.replace(/^\/+/, '')
    return `${baseUrl}/${cleanPath}`
  }

  getAppUrl(path?: string): string {
    const baseUrl = this.config.appUrl.replace(/\/+$/, '')
    if (!path) return baseUrl
    const cleanPath = path.replace(/^\/+/, '')
    return `${baseUrl}/${cleanPath}`
  }
}

// Export singleton instance
export const envConfig = EnvConfig.getInstance()

// Export typed config for direct access
export const config = envConfig.getAll()

// Export helper functions
export const isProduction = () => envConfig.isProduction()
export const isDevelopment = () => envConfig.isDevelopment()
export const isFeatureEnabled = (feature: keyof FrontendConfig['features']) => 
  envConfig.isFeatureEnabled(feature)
export const getApiEndpoint = (path: string) => envConfig.getApiEndpoint(path)
export const getAppUrl = (path?: string) => envConfig.getAppUrl(path)