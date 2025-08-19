import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'

/**
 * Simplified Supabase Service - Direct client usage following KISS principle
 * No unnecessary abstractions, just what we need
 */
@Injectable()
export class SupabaseService {
	private readonly logger = new Logger(SupabaseService.name)
	private adminClient: SupabaseClient<Database>
	private readonly supabaseUrl: string
	private readonly supabaseAnonKey: string

	constructor(private configService: ConfigService) {
		// Get config once in constructor
		this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || ''
		this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || ''
		const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || ''

		if (!this.supabaseUrl || !supabaseServiceKey) {
			throw new Error('Missing required Supabase configuration')
		}

		// Create admin client immediately - no async initialization needed
		this.adminClient = createClient<Database>(
			this.supabaseUrl,
			supabaseServiceKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				}
			}
		)

		this.logger.log('✅ SupabaseService initialized')
	}

	/**
	 * Get admin client for system operations
	 */
	getAdminClient(): SupabaseClient<Database> {
		return this.adminClient
	}

	/**
	 * Get user-scoped client for RLS operations
	 */
	getUserClient(userToken: string): SupabaseClient<Database> {
		if (!this.supabaseUrl || !this.supabaseAnonKey) {
			throw new Error('Missing Supabase configuration')
		}

		return createClient<Database>(this.supabaseUrl, this.supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			},
			global: {
				headers: {
					Authorization: `Bearer ${userToken}`
				}
			}
		})
	}

	/**
	 * Simple health check - no complex timeout logic
	 */
	async checkHealth(): Promise<boolean> {
		try {
			const { error } = await this.adminClient
				.from('healthcheck')
				.select('1')
				.limit(1)
				.single()

			// Table doesn't need to exist for health check
			return !error || error.code === 'PGRST116'
		} catch {
			return false
		}
	}
}