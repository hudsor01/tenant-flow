import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { SupabaseService } from './supabase.service'

@Global()
@Module({})
export class SupabaseModule {
	static forRootAsync(): DynamicModule {
		return {
			module: SupabaseModule,
			imports: [ConfigModule],
			providers: [
				{
					provide: SUPABASE_ADMIN_CLIENT,
					useFactory: (config: ConfigService) => {
						const url = config.get<string>('SUPABASE_URL')
						const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY')
						if (!url || !key) {
							throw new Error('Missing Supabase configuration')
						}
						return createClient(url, key, {
							auth: { persistSession: false, autoRefreshToken: false }
						})
					},
					inject: [ConfigService]
				},
				SupabaseService
			],
			exports: [SUPABASE_ADMIN_CLIENT, SupabaseService]
		}
	}
}
