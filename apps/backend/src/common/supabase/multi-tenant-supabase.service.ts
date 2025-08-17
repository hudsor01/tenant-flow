import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from './supabase.service'
import { isValidUserId } from '../security/type-guards'

/**
 * Service managing multi-tenant Supabase clients with RLS support
 * Replaces MultiTenantPrismaService with Supabase-based implementation
 */
@Injectable()
export class MultiTenantSupabaseService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(MultiTenantSupabaseService.name)
	private readonly tenantClients = new Map<
		string,
		{ client: SupabaseClient<Database>; lastUsed: Date }
	>()
	private readonly MAX_POOL_SIZE = 10
	private readonly CLIENT_TTL = 300000 // 5 minutes
	private cleanupInterval?: NodeJS.Timeout

	constructor(
		private supabaseService: SupabaseService,
		private configService: ConfigService
	) {}

	async onModuleInit() {
		this.logger.log('🔄 Initializing MultiTenantSupabaseService...')

		// Setup cleanup interval for unused tenant clients
		this.cleanupInterval = setInterval(
			() => this.cleanupUnusedClients(),
			this.CLIENT_TTL
		)

		this.logger.log('✅ MultiTenantSupabaseService initialized')
	}

	async onModuleDestroy() {
		// Clear the cleanup interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval)
		}

		// Cleanup all tenant clients
		this.tenantClients.clear()
		this.logger.log('MultiTenantSupabaseService destroyed')
	}

	private cleanupUnusedClients() {
		const now = new Date()
		const clientsToRemove: string[] = []

		for (const [userId, { lastUsed }] of Array.from(this.tenantClients)) {
			if (now.getTime() - lastUsed.getTime() > this.CLIENT_TTL) {
				clientsToRemove.push(userId)
			}
		}

		for (const userId of clientsToRemove) {
			this.tenantClients.delete(userId)
			this.logger.debug(
				`Cleaned up unused tenant client for user ${userId}`
			)
		}
	}

	/**
	 * Get admin Supabase client that bypasses RLS
	 * Use for: user sync, billing, cross-tenant operations
	 */
	getAdminClient(): SupabaseClient<Database> {
		return this.supabaseService.getAdminClient()
	}

	/**
	 * Get tenant-scoped Supabase client that respects RLS
	 * Implements connection pooling for better resource management
	 */
	async getTenantClient(
		userId: string,
		userToken?: string
	): Promise<SupabaseClient<Database>> {
		// Enhanced security validation using type guards
		if (!isValidUserId(userId)) {
			this.logger.error('Security validation failed for userId', {
				userId: String(userId).substring(0, 8) + '...'
			})
			throw new Error(
				'Invalid userId provided - security validation failed'
			)
		}

		// Check if we have an existing client for this user
		const existing = this.tenantClients.get(userId)
		if (existing) {
			existing.lastUsed = new Date()
			this.logger.debug(
				`Reusing existing tenant client for user ${userId}`
			)
			return existing.client
		}

		// Check pool size limit
		if (this.tenantClients.size >= this.MAX_POOL_SIZE) {
			// Remove oldest client to make room
			const oldestEntry = Array.from(this.tenantClients.entries()).sort(
				(a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime()
			)[0]

			if (oldestEntry) {
				const [oldUserId] = oldestEntry
				this.tenantClients.delete(oldUserId)
				this.logger.debug(
					`Evicted oldest tenant client for user ${oldUserId}`
				)
			}
		}

		try {
			const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
			const supabaseAnonKey =
				this.configService.get<string>('SUPABASE_ANON_KEY')

			if (!supabaseUrl || !supabaseAnonKey) {
				throw new Error('Missing required Supabase configuration')
			}

			// Create a new client for this tenant
			// If userToken is provided, use it; otherwise create an unsigned client
			const tenantClient = createClient<Database>(
				supabaseUrl,
				supabaseAnonKey,
				{
					auth: {
						persistSession: false,
						autoRefreshToken: false
					},
					global: userToken
						? {
								headers: {
									Authorization: `Bearer ${userToken}`
								}
							}
						: undefined,
					db: {
						schema: 'public'
					}
				}
			)

			// Store in pool
			this.tenantClients.set(userId, {
				client: tenantClient,
				lastUsed: new Date()
			})

			this.logger.debug(`Created new tenant client for user ${userId}`)
			return tenantClient
		} catch (error) {
			this.logger.error(
				`Failed to create tenant client for user ${userId}:`,
				error
			)
			throw new Error(
				`Failed to initialize tenant database connection: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			)
		}
	}

	/**
	 * Execute a query with tenant context
	 * Automatically handles the tenant-scoped client
	 */
	async withTenantContext<T>(
		userId: string,
		callback: (client: SupabaseClient<Database>) => Promise<T>,
		userToken?: string
	): Promise<T> {
		// Enhanced security validation using type guards
		if (!isValidUserId(userId)) {
			this.logger.error('Security validation failed for userId', {
				userId: String(userId).substring(0, 8) + '...'
			})
			throw new Error(
				'Invalid userId provided - security validation failed'
			)
		}

		if (typeof callback !== 'function') {
			throw new Error('Callback must be a function')
		}

		try {
			// Get a pooled tenant client
			const tenantClient = await this.getTenantClient(userId, userToken)

			// Execute the callback with the tenant client
			const result = await callback(tenantClient)

			return result
		} catch (error) {
			this.logger.error(
				`Error in withTenantContext for user ${userId}:`,
				{
					error:
						error instanceof Error
							? error.message
							: 'Unknown error',
					stack: error instanceof Error ? error.stack : undefined,
					userId
				}
			)

			// Re-throw with additional context
			if (error instanceof Error) {
				throw new Error(`Tenant operation failed: ${error.message}`)
			}
			throw new Error('Tenant operation failed with unknown error')
		}
	}

	/**
	 * Manually disconnect a specific tenant client
	 * Useful for cleanup after errors or explicit resource management
	 */
	async disconnectTenantClient(userId: string): Promise<void> {
		const entry = this.tenantClients.get(userId)
		if (entry) {
			this.tenantClients.delete(userId)
			this.logger.debug(
				`Manually disconnected tenant client for user ${userId}`
			)
		}
	}

	/**
	 * Get connection pool statistics for monitoring
	 */
	getPoolStats() {
		return {
			activeConnections: this.tenantClients.size,
			maxPoolSize: this.MAX_POOL_SIZE,
			clientTTL: this.CLIENT_TTL,
			clients: Array.from(this.tenantClients.entries()).map(
				([userId, { lastUsed }]) => ({
					userId: userId.substring(0, 8) + '...',
					lastUsed: lastUsed.toISOString(),
					ageMinutes: Math.round(
						(Date.now() - lastUsed.getTime()) / 60000
					)
				})
			)
		}
	}
}
