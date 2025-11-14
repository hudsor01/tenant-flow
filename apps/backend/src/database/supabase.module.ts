import {
	DynamicModule,
	Global,
	Logger,
	Module
} from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
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
					useFactory: (config: AppConfigService) => {
						const url = config.getSupabaseUrl()
						const key = config.getSupabaseSecretKey()

						if (!url || !key) {
							// Helpful error to aid developers who forget to run with Doppler
							throw new Error(
								'Missing Supabase configuration - ensure you run the process with Doppler (e.g. `doppler run -- pnpm dev`) or set SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.'
							)
						}

						const logger = new Logger('SupabaseModule')
						logger.debug(
							'Supabase admin client: using AppConfigService for credentials'
						)

						return createClient(url, key, {
							auth: { persistSession: false, autoRefreshToken: false }
						})
					},
					inject: [AppConfigService]
				},
				SupabaseService
			],
			exports: [SUPABASE_ADMIN_CLIENT, SupabaseService]
		}
	}
}
