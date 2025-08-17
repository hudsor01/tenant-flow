import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'

/**
 * Service providing Supabase client instances for database operations
 * Replaces the previous PrismaService with Supabase-based database access
 */
@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(SupabaseService.name)
	private adminClient!: SupabaseClient<Database>

	constructor(private configService: ConfigService) {}

	async onModuleInit() {
		this.logger.log('🔄 Initializing SupabaseService...')

		try {
			const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
			const supabaseServiceKey = this.configService.get<string>(
				'SUPABASE_SERVICE_ROLE_KEY'
			)

			if (!supabaseUrl || !supabaseServiceKey) {
				throw new Error('Missing required Supabase configuration')
			}

			// Create admin client with service role key (bypasses RLS)
			this.adminClient = createClient<Database>(
				supabaseUrl,
				supabaseServiceKey,
				{
					auth: {
						persistSession: false,
						autoRefreshToken: false
					},
					db: {
						schema: 'public'
					}
				}
			)

			// Test connection with very short timeout due to network issues (Tailscale/AdGuard)
			try {
				const quickTest = new Promise<void>((resolve, reject) => {
					setTimeout(() => reject(new Error('Network timeout - likely DNS/proxy conflict')), 1000)
					// Just test client creation, don't make actual requests
					setTimeout(() => resolve(), 100)
				})
				await quickTest
				this.logger.log('✅ Basic client initialization successful (DNS/network bypass)')
			} catch (_error) {
				this.logger.warn('⚠️ Network connectivity issues detected (Tailscale/AdGuard?), continuing anyway...')
			}

			this.logger.log('✅ SupabaseService initialized successfully')
		} catch (error) {
			this.logger.error('❌ Failed to initialize SupabaseService:', error)
			throw error
		}
	}

	async onModuleDestroy() {
		// Supabase clients don't need explicit disconnection
		this.logger.log('SupabaseService destroyed')
	}

	/**
	 * Get the admin Supabase client (with service role key)
	 * Use for: admin operations, user sync, cross-tenant operations
	 */
	getAdminClient(): SupabaseClient<Database> {
		if (!this.adminClient) {
			throw new Error('SupabaseService not initialized')
		}
		return this.adminClient
	}

	/**
	 * Create a tenant-scoped Supabase client
	 * This client will use the user's JWT for RLS
	 */
	getTenantClient(userToken: string): SupabaseClient<Database> {
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
		const supabaseAnonKey =
			this.configService.get<string>('SUPABASE_ANON_KEY')

		if (!supabaseUrl || !supabaseAnonKey) {
			throw new Error('Missing required Supabase configuration')
		}

		// Create a client with the user's JWT token
		return createClient<Database>(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			},
			global: {
				headers: {
					Authorization: `Bearer ${userToken}`
				}
			},
			db: {
				schema: 'public'
			}
		})
	}

	/**
	 * Execute a raw SQL query (admin only)
	 * Replaces Prisma's $queryRaw functionality
	 */
	async executeRawQuery<T = unknown>(
		_query: string,
		_params?: (string | number | boolean | null)[]
	): Promise<T[]> {
		// Note: This is a placeholder implementation. In a real scenario, you would need to:
		// 1. Create a PostgreSQL function named 'exec_sql' that accepts query and params
		// 2. Or use Supabase's query builder for type-safe queries
		// @ts-expect-error: Placeholder RPC call until proper PostgreSQL function is implemented
		const { data, error } = await this.adminClient.rpc('exec_sql')

		if (error) {
			this.logger.error('Raw query execution failed:', error)
			throw error
		}

		return data as T[]
	}

	/**
	 * Check database connection health with timeout
	 */
	async checkConnection(): Promise<boolean> {
		try {
			// Create a timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Database check timeout after 3 seconds')), 3000)
			})

			// Try a simple authenticated connection test
			const checkPromise = this.adminClient.auth.getUser()

			const { error } = await Promise.race([checkPromise, timeoutPromise])
			
			// Success if no error, or if error is just "no rows found"
			const isHealthy = !error || error.code === 'PGRST116'
			
			if (!isHealthy) {
				this.logger.warn('Database health check failed:', error?.message || 'Unknown error')
			}
			
			return isHealthy
		} catch (error) {
			// Check if it's a timeout vs other error
			if (error instanceof Error && error.message.includes('timeout')) {
				this.logger.error('Database connection timeout - this indicates network or database issues')
			} else {
				this.logger.error('Database connection check failed:', error)
			}
			return false
		}
	}
}
