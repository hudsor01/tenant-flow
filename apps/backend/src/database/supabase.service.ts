import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { EnvironmentVariables } from '../config/config.schema'

@Injectable()
export class SupabaseService {
	private adminClient: SupabaseClient<Database>

	constructor(
		@Inject(ConfigService) private readonly configService: ConfigService<EnvironmentVariables>,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
		const supabaseUrl = this.configService.get('SUPABASE_URL', {
			infer: true
		})
		const supabaseServiceKey = this.configService.get(
			'SUPABASE_SERVICE_ROLE_KEY',
			{ infer: true }
		)

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

		// Defensive check for logger injection issue
		if (this.logger && this.logger.info) {
			this.logger.info('Supabase service initialized successfully')
		} else {
			console.log('Supabase service initialized successfully (logger not available)')
		}
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
