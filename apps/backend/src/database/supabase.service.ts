import { Injectable, Logger } from '@nestjs/common'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { TypeSafeConfigService } from '../config/config.service'

@Injectable()
export class SupabaseService {
	private readonly _logger = new Logger(SupabaseService.name)
	private adminClient: SupabaseClient<Database>

	constructor(private configService: TypeSafeConfigService) {
		void this._logger // Prevent unused variable warning
		this.adminClient = createClient<Database>(
			this.configService.supabase.url,
			this.configService.supabase.serviceRoleKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				}
			}
		)
	}

	getAdminClient(): SupabaseClient<Database> {
		return this.adminClient
	}

	getUserClient(userToken: string): SupabaseClient<Database> {
		return createClient<Database>(
			this.configService.supabase.url,
			this.configService.supabase.anonKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				},
				global: {
					headers: {
						Authorization: `Bearer ${userToken}`
					}
				}
			}
		)
	}

	async checkConnection(): Promise<{ status: string; message?: string }> {
		try {
			const { error } = await this.adminClient
				.from('users')
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
