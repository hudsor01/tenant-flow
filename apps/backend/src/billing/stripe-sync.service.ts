import { Injectable, OnModuleInit, Optional } from '@nestjs/common'
import { StripeSync, runMigrations } from '@supabase/stripe-sync-engine'
import { Logger } from '@nestjs/common'

/**
 * Ultra-Native Stripe Sync Service
 * 
 * Direct integration with @supabase/stripe-sync-engine
 * No abstractions, wrappers, or custom middleware
 * Follows official Supabase recommendations from Sub-Plan 1
 */
@Injectable()
export class StripeSyncService implements OnModuleInit {
  private stripeSync!: StripeSync
  private migrationsRun = false
  private initialized = false

  constructor(
    @Optional() private readonly logger?: Logger
  ) {
    // Context removed - NestJS Logger doesn't support setContext
  }

  async onModuleInit() {
    try {
      // Initialize Stripe Sync Engine during module initialization
      this.logger?.log('Initializing Stripe Sync Engine...')
      
      // Use environment variables directly for critical configuration
      // This avoids potential ConfigService injection timing issues
      const databaseUrl = process.env.DATABASE_URL
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

      if (!databaseUrl || !stripeSecretKey) {
        throw new Error('Missing required configuration for Stripe Sync Engine: DATABASE_URL and STRIPE_SECRET_KEY are required')
      }

      const schema = process.env.STRIPE_SYNC_DATABASE_SCHEMA ?? 'stripe'
      const autoExpandLists = process.env.STRIPE_SYNC_AUTO_EXPAND_LISTS !== 'false'

      this.stripeSync = new StripeSync({
        databaseUrl,
        stripeSecretKey,
        stripeWebhookSecret: stripeWebhookSecret || '',
        schema,
        autoExpandLists
      })

      this.initialized = true
      this.logger?.log('Stripe Sync Engine initialized', {
        schema,
        autoExpandLists,
        hasWebhookSecret: !!stripeWebhookSecret
      })

      // Run migrations
      this.logger?.log('Running Stripe Sync Engine migrations...')
      
      await runMigrations({
        databaseUrl,
        schema
      })
      
      this.migrationsRun = true
      this.logger?.log('Stripe Sync Engine migrations completed successfully')
    } catch (error) {
      this.logger?.error('Stripe Sync Engine initialization failed:', error)
      throw error
    }
  }

  /**
   * Process Stripe webhook (called by webhook controller)
   * Direct method exposure - no abstractions
   */
  async processWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.initialized || !this.stripeSync) {
      throw new Error('Stripe Sync Engine not initialized')
    }
    return this.stripeSync.processWebhook(rawBody, signature)
  }

  /**
   * Sync a single Stripe entity by ID
   * Useful for manual sync or testing
   */
  async syncSingleEntity(entityId: string): Promise<unknown> {
    if (!this.initialized || !this.stripeSync) {
      throw new Error('Stripe Sync Engine not initialized')
    }
    this.logger?.log('Syncing single Stripe entity:', { entityId })
    return this.stripeSync.syncSingleEntity(entityId)
  }

  /**
   * Backfill all historical Stripe data
   * Run once during initial setup
   */
  async backfillData(): Promise<{ success: boolean }> {
    if (!this.initialized || !this.stripeSync) {
      throw new Error('Stripe Sync Engine not initialized')
    }
    
    this.logger?.log('Starting Stripe data backfill...')
    const startTime = Date.now()
    
    try {
      await this.stripeSync.syncBackfill()
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      this.logger?.log('Stripe data backfill completed successfully', { 
        duration: `${duration}s` 
      })
      return { success: true }
    } catch (error) {
      this.logger?.error('Stripe data backfill failed:', error)
      throw error
    }
  }

  /**
   * Get sync engine health status
   */
  getHealthStatus(): { initialized: boolean; migrationsRun: boolean } {
    return {
      initialized: this.initialized && !!this.stripeSync,
      migrationsRun: this.migrationsRun
    }
  }

  /**
   * Test connection - for health checks
   */
  async testConnection(): Promise<boolean> {
    try {
      return this.getHealthStatus().initialized && this.getHealthStatus().migrationsRun
    } catch (error) {
      this.logger?.error('Health check failed:', error)
      return false
    }
  }

  /**
   * Check if service is healthy
   */
  async isHealthy(): Promise<boolean> {
    return this.testConnection()
  }
}