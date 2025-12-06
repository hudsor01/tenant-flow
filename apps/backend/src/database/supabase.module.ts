import type {
  DynamicModule
} from '@nestjs/common'
import {
  Global,
  Module
} from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { SupabaseService } from './supabase.service'
import { StorageService } from './storage.service'
import { SupabaseConfigValidator } from './supabase-config.validator'

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
          useFactory: async (config: AppConfigService, logger: AppLogger) => {
            const url = config.getSupabaseUrl()
            const key = config.getSupabaseSecretKey()
            const projectRef = config.getSupabaseProjectRef()

            if (!url || !key) {
              throw new Error(
                '[SUP-003] Missing Supabase configuration - ensure you run with Doppler (e.g. `doppler run -- pnpm dev`) ' +
                'or set SUPABASE_URL and SB_SECRET_KEY environment variables.'
              )
            }

            // Validate configuration format and consistency
            const validation = SupabaseConfigValidator.validate({
              url,
              secretKey: key,
              projectRef
            })

            if (!validation.isValid) {
              const errorMessage = `[SUP-003] Supabase configuration validation failed: ${validation.errors.join('; ')}`
              logger.error(errorMessage)
              throw new Error(errorMessage)
            }

            // Log warnings (non-fatal)
            if (validation.warnings.length > 0) {
              validation.warnings.forEach(warning => {
                logger.warn(`[SUP-003] Supabase configuration warning: ${warning}`)
              })
            }

            logger.log(
              `[ADMIN_CLIENT_INIT] URL=${url?.substring(0, 35)}..., KEY_PREFIX=${key?.substring(0, 20)}...`
            )

            // NOTE: This admin client bypasses RLS - use ONLY for:
            // 1. Webhooks (Stripe, Auth) where there's no user context
            // 2. Background jobs and cron tasks
            // 3. Health checks
            // For user requests, use SupabaseService.getUserClient(token) instead
            const client = createClient(url, key, {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
              }
            })

            // Verify database connectivity on startup (if enabled)
            const verifyOnStartup = process.env.VERIFY_DB_ON_STARTUP !== 'false'
            if (verifyOnStartup) {
              try {
                logger.log('Verifying database connectivity on startup...')

                // Simple connectivity check using table ping
                const { error } = await client
                  .from('users')
                  .select('*', { count: 'exact', head: true })

                if (error) {
                  const errorMessage = `[SUP-004] Startup connectivity verification failed: ${error.message || JSON.stringify(error)}`
                  logger.error(errorMessage, {
                    url: url.substring(0, 35),
                    error: error
                  })
                  throw new Error(errorMessage)
                }

                logger.log('Supabase configuration validated successfully')
              } catch (error) {
                const errorMessage = error instanceof Error
                  ? error.message
                  : `[SUP-004] Startup connectivity verification failed: ${String(error)}`
                logger.error(errorMessage)
                throw new Error(errorMessage)
              }
            } else {
              logger.log('Skipping startup connectivity verification (VERIFY_DB_ON_STARTUP=false)')
            }

            return client
          },
          inject: [AppConfigService, AppLogger]
        },
        SupabaseService,
        StorageService
      ],
      exports: [SUPABASE_ADMIN_CLIENT, SupabaseService, StorageService]
    }
  }
}
