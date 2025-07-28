import { Injectable } from '@nestjs/common'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { compress } from 'hono/compress'
import { etag } from 'hono/etag'
import { createAuthRoutes } from './routes/auth.routes'
import { createPropertiesRoutes } from './routes/properties.routes'
import { createTenantsRoutes } from './routes/tenants.routes'
import { createMaintenanceRoutes } from './routes/maintenance.routes'
import { createUnitsRoutes } from './routes/units.routes'
import { createLeasesRoutes } from './routes/leases.routes'
import { createSubscriptionsRoutes } from './routes/subscriptions.routes'

// Middleware imports
import { createRateLimitMiddleware, writeOperationRateLimit } from './middleware/rate-limit.middleware'
import { 
  validateRequestSize, 
  validateContentType, 
  validateApiVersion,
  validateUserAgent,
  healthCheckMiddleware
} from './middleware/validation.middleware'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import type { Variables } from './middleware/auth.middleware'
import { createAuthMiddleware } from './middleware/auth.middleware'

// Service imports
import { AuthService } from '../auth/auth.service'
import { EmailService } from '../email/email.service'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { MaintenanceService } from '../maintenance/maintenance.service'
import { UnitsService } from '../units/units.service'
import { LeasesService } from '../leases/leases.service'
import { SubscriptionsManagerService } from '../subscriptions/subscriptions-manager.service'
import { StripeSubscriptionService } from '../stripe/stripe-subscription.service'
import { StripeService } from '../stripe/stripe.service'
import { WebhookService } from '../stripe/webhook.service'
import { StorageService } from '../storage/storage.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class HonoService {
  private app: Hono<{ Variables: Variables }>

  constructor(
    private authService: AuthService,
    private emailService: EmailService,
    private propertiesService: PropertiesService,
    private tenantsService: TenantsService,
    private maintenanceService: MaintenanceService,
    private unitsService: UnitsService,
    private leasesService: LeasesService,
    private stripeSubscriptionService: StripeSubscriptionService,
    private subscriptionsManagerService: SubscriptionsManagerService,
    private stripeService: StripeService,
    private webhookService: WebhookService,
    private storageService: StorageService,
    private usersService: UsersService
  ) {
    this.app = this.createApp()
  }

  private createApp() {
    const app = new Hono<{ Variables: Variables }>()

    // Global error handler (must be first)
    app.onError(errorHandler)
    app.notFound(notFoundHandler)

    // Performance middleware
    app.use('*', compress()) // Response compression
    app.use('*', etag()) // ETag caching
    app.use('*', timeout(30000)) // 30 second timeout

    // Security middleware
    app.use('*', secureHeaders({
      crossOriginEmbedderPolicy: false, // Allow embedding for dashboard widgets
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"]
      }
    }))

    // Validation middleware
    app.use('*', healthCheckMiddleware) // Handle health checks early
    app.use('*', validateUserAgent) // Basic bot detection
    app.use('*', validateRequestSize(10 * 1024 * 1024)) // 10MB max request size
    app.use('*', validateContentType(['application/json', 'multipart/form-data']))
    app.use('*', validateApiVersion(['v1']))

    // Rate limiting
    app.use('*', createRateLimitMiddleware())

    // CORS (after rate limiting)
    app.use(
      '*',
      cors({
        origin: (origin: string) => {
          // Parse CORS_ORIGINS from environment
          const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || []
          
          // Add development origins if in development mode
          if (process.env.NODE_ENV === 'development') {
            corsOrigins.push('http://localhost:5173', 'http://localhost:3000')
          }
          
          // Always include production domains
          corsOrigins.push('https://tenantflow.app', 'https://www.tenantflow.app')
          
          // Check if origin is allowed
          if (corsOrigins.includes(origin)) {
            return origin;
          }
          return null;
        },
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        maxAge: 86400 // 24 hours
      })
    )

    // Logging (after CORS to avoid preflight noise)
    app.use('*', logger((message, ...rest) => {
      // Enhanced logging format
      console.log(`[${new Date().toISOString()}] ${message}`, ...rest)
    }))

    // Create API routes with enhanced middleware
    const api = new Hono<{ Variables: Variables }>()

    // Apply write operation rate limiting to mutation endpoints
    api.use('/*/create', writeOperationRateLimit)
    api.use('/*/update', writeOperationRateLimit)
    api.use('/*/delete', writeOperationRateLimit)

    // Create auth middleware with proper AuthService injection
    const authMiddleware = createAuthMiddleware(this.authService)
    
    // Mount all routes with proper grouping
    api.route('/auth', createAuthRoutes(this.authService, this.emailService))
    api.route('/properties', createPropertiesRoutes(this.propertiesService, this.storageService, authMiddleware))
    api.route('/tenants', createTenantsRoutes(this.tenantsService, this.storageService))
    api.route('/maintenance', createMaintenanceRoutes(this.maintenanceService))
    api.route('/units', createUnitsRoutes(this.unitsService))
    api.route('/leases', createLeasesRoutes(this.leasesService))
    api.route('/subscriptions', createSubscriptionsRoutes({
      stripeSubscriptionService: this.stripeSubscriptionService,
      subscriptionsManagerService: this.subscriptionsManagerService,
      webhookService: this.webhookService,
      stripeService: this.stripeService
    }))

    // Mount API under /api/v1
    app.route('/api/v1', api)

    // Enhanced health check with system information
    app.get('/health', (c) => c.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }))

    // API documentation endpoint
    app.get('/api', (c) => c.json({
      name: 'TenantFlow API',
      version: 'v1',
      description: 'Property management platform API',
      endpoints: {
        health: '/health',
        auth: '/api/v1/auth',
        properties: '/api/v1/properties',
        tenants: '/api/v1/tenants',
        maintenance: '/api/v1/maintenance',
        units: '/api/v1/units',
        leases: '/api/v1/leases',
        subscriptions: '/api/v1/subscriptions'
      }
    }))

    return app
  }

  getApp() {
    return this.app
  }
}

// Type export for client-side RPC type inference
export type HonoAppType = ReturnType<HonoService['createApp']>