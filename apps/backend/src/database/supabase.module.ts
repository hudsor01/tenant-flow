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
          useFactory: (config: AppConfigService, logger: AppLogger) => {
            const url = config.getSupabaseUrl()
            const key = config.getSupabaseSecretKey()

            if (!url || !key) {
              throw new Error(
                'Missing Supabase configuration - ensure you run with Doppler (e.g. `doppler run -- pnpm dev`) ' +
                'or set SUPABASE_URL and SB_SECRET_KEY environment variables.'
              )
            }

            logger.log(
              `[ADMIN_CLIENT_INIT] URL=${url?.substring(0, 35)}..., KEY_PREFIX=${key?.substring(0, 20)}...`
            )

            // NOTE: This admin client bypasses RLS - use ONLY for:
            // 1. Webhooks (Stripe, Auth) where there's no user context
            // 2. Background jobs and cron tasks
            // 3. Health checks
            // For user requests, use SupabaseService.getUserClient(token) instead
            return createClient(url, key, {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
              },
              // Server-side optimizations for long-running processes
              global: {
                headers: {
                  'x-client-info': 'tenantflow-backend'
                }
              },
              db: {
                schema: 'public'
              }
            })
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
