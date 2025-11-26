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
import { StorageService } from './storage.service'

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
						logger.log(
							`[ADMIN_CLIENT_INIT] URL=${url?.substring(0, 35)}..., KEY_PREFIX=${key?.substring(0, 20)}...`
						)

						return createClient(url, key, {
						auth: {
							persistSession: false,
							autoRefreshToken: false,
							detectSessionInUrl: false
						}
					})
					},
					inject: [AppConfigService]
				},
				SupabaseService,
				StorageService
			],
			exports: [SUPABASE_ADMIN_CLIENT, SupabaseService, StorageService]
		}
	}
}
