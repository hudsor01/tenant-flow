import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit
} from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'

/**
 * SupabaseService provides database access using Supabase client
 * Replaces the previous Prisma implementation
 */
@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(SupabaseService.name)
	private supabase: SupabaseClient<Database>
	private adminClient: SupabaseClient<Database>

	constructor() {
		const supabaseUrl =
			process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
		const supabaseAnonKey =
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
			process.env.SUPABASE_ANON_KEY
		const supabaseServiceKey =
			process.env.SUPABASE_SERVICE_ROLE_KEY ||
			process.env.SUPABASE_SERVICE_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			throw new Error('Missing Supabase configuration')
		}

		// Regular client with RLS
		this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

		// Admin client that bypasses RLS (if service key available)
		if (supabaseServiceKey) {
			this.adminClient = createClient<Database>(
				supabaseUrl,
				supabaseServiceKey,
				{
					auth: {
						autoRefreshToken: false,
						persistSession: false
					}
				}
			)
		} else {
			this.adminClient = this.supabase
		}
	}

	async onModuleInit(): Promise<void> {
		this.logger.log('✅ Supabase client initialized')
	}

	async onModuleDestroy(): Promise<void> {
		this.logger.log('✅ Supabase client cleanup completed')
	}

	// Get the regular Supabase client (respects RLS)
	getClient(): SupabaseClient<Database> {
		return this.supabase
	}

	// Get the admin Supabase client (bypasses RLS)
	getAdminClient(): SupabaseClient<Database> {
		return this.adminClient
	}

	// Helper method to get a client with specific auth token
	getAuthClient(token: string): SupabaseClient<Database> {
		const supabaseUrl =
			process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
		const supabaseAnonKey =
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
			process.env.SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			throw new Error('Missing Supabase configuration')
		}

		return createClient<Database>(supabaseUrl, supabaseAnonKey, {
			global: {
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		})
	}
}
