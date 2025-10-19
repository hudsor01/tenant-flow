import { Injectable, Logger } from '@nestjs/common'
import { StripeSync } from '@supabase/stripe-sync-engine'

/**
 * Ultra-Native Stripe Sync Service
 *
 * Direct integration with @supabase/stripe-sync-engine npm library
 * No abstractions, wrappers, or custom middleware
 *
 * Usage per official docs:
 * 1. Initialize once with poolConfig
 * 2. Call sync.processWebhook(payload, signature) for webhooks
 * 3. Migrations run separately via CLI, not at runtime
 */
@Injectable()
export class StripeSyncService {
	private readonly logger = new Logger(StripeSyncService.name)
	private stripeSync: StripeSync | null = null

	constructor() {
		// Stripe Sync Engine is initialized lazily on first use
		// to avoid blocking app startup
	}

	private ensureInitialized(): StripeSync {
		if (this.stripeSync) {
			return this.stripeSync
		}

		// Initialize Stripe Sync Engine per official documentation
		// https://supabase.com/blog/stripe-engine-as-sync-library
		const databaseUrl =
			process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL
		const stripeSecretKey = process.env.STRIPE_SECRET_KEY
		const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

		if (!databaseUrl || !stripeSecretKey || !stripeWebhookSecret) {
			throw new Error(
				'Missing required configuration: DATABASE_DIRECT_URL, STRIPE_SECRET_KEY, and STRIPE_WEBHOOK_SECRET are required'
			)
		}

		// NOTE: Migrations must be run separately via scripts/stripe-sync-migrate.ts
		// The stripe schema must exist before initializing StripeSync
		this.stripeSync = new StripeSync({
			poolConfig: {
				connectionString: databaseUrl,
				max: 10 // Connection pool size
			},
			stripeSecretKey,
			stripeWebhookSecret,
			schema: 'stripe', // Optional: defaults to 'stripe'
			autoExpandLists: true, // Recommended by docs
			backfillRelatedEntities: false // Recommended by docs
		})

		this.logger.log('Stripe Sync Engine initialized successfully')

		return this.stripeSync
	}

	/**
	 * Process Stripe webhook - per official documentation
	 * https://github.com/supabase/stripe-sync-engine#usage
	 */
	async processWebhook(payload: Buffer, signature: string): Promise<void> {
		const sync = this.ensureInitialized()
		return sync.processWebhook(payload, signature)
	}

	/**
	 * Sync a single Stripe entity by ID
	 * Entity type is auto-detected from ID prefix (cus_, prod_, etc.)
	 * https://github.com/supabase/stripe-sync-engine#syncing-a-single-entity
	 */
	async syncSingleEntity(entityId: string): Promise<unknown> {
		this.logger.log('Syncing single Stripe entity', { entityId })
		const sync = this.ensureInitialized()
		return sync.syncSingleEntity(entityId)
	}

	/**
	 * Backfill historical Stripe data
	 * https://github.com/supabase/stripe-sync-engine#backfilling-data
	 */
	async syncBackfill(options?: {
		object?:
			| 'all'
			| 'charge'
			| 'customer'
			| 'dispute'
			| 'invoice'
			| 'payment_method'
			| 'payment_intent'
			| 'plan'
			| 'price'
			| 'product'
			| 'setup_intent'
			| 'subscription'
		created?: { gt?: number; gte?: number; lt?: number; lte?: number }
	}): Promise<void> {
		this.logger.log('Starting Stripe data backfill', options)
		const startTime = Date.now()

		const sync = this.ensureInitialized()
		await sync.syncBackfill(options)

		const duration = ((Date.now() - startTime) / 1000).toFixed(2)
		this.logger.log('Stripe data backfill completed', {
			duration: `${duration}s`
		})
	}
}
