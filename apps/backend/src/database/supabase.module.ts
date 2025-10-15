import { DynamicModule, Global, Logger, Module } from '@nestjs/common'
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
						const envUrl = process.env.SUPABASE_URL
						const envKey =
							process.env.SUPABASE_SERVICE_ROLE_KEY ||
							process.env.SERVICE_ROLE_KEY

						const url = envUrl ?? config.get<string>('SUPABASE_URL')
						const key =
							envKey ?? config.get<string>('SUPABASE_SERVICE_ROLE_KEY')

						if (!url || !key) {
							// Helpful error to aid developers who forget to run with Doppler
							throw new Error(
								'Missing Supabase configuration - ensure you run the process with Doppler (e.g. `doppler run -- pnpm dev`) or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.'
							)
						}

						// Log which source provided the credentials (env vs config service)

						const logger = new Logger('SupabaseModule')
						if (envUrl || envKey) {
							logger.debug(
								'Supabase admin client: using environment variables (Doppler) for credentials'
							)
						} else {
							logger.debug(
								'Supabase admin client: using ConfigService for credentials'
							)
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
