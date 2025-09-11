import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared'

@Injectable()
export class SupabaseService {
	private adminClient: SupabaseClient<Database>

	constructor() {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseServiceKey = process.env.SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new InternalServerErrorException('Supabase configuration is missing')
		}

		this.adminClient = createClient<Database>(
			supabaseUrl,
			supabaseServiceKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				}
			}
		)

		// Ultra-native: direct logging
		console.log('Supabase service initialized successfully')
	}

	getAdminClient(): SupabaseClient<Database> {
		return this.adminClient
	}

	getUserClient(userToken: string): SupabaseClient<Database> {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseAnonKey) {
			throw new InternalServerErrorException('Supabase configuration is missing for user client')
		}

		return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

	async checkConnection(): Promise<{ status: string; message?: string }> {
		try {
			const { error } = await this.adminClient
				.from('User')
				.select('count', { count: 'exact', head: true })

			if (error) {
				return { status: 'unhealthy', message: error.message }
			}

			return { status: 'healthy' }
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error'
			return { status: 'unhealthy', message }
		}
	}
}
