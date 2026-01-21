/**
 * Supabase Module - Three-Tier Client Strategy (ADR-0004)
 *
 * This module provides Supabase clients following a three-tier pattern:
 *
 * 1. ADMIN CLIENT (SUPABASE_ADMIN_CLIENT token):
 *    - Singleton, bypasses RLS
 *    - Use for: webhooks, background jobs, health checks, admin operations
 *    - Never for: user-initiated requests
 *
 * 2. USER CLIENT POOL (via SupabaseService.getUserClient):
 *    - Per-user clients with RLS enforcement
 *    - Use for: all user requests where permissions matter
 *    - Config: 50 max clients, 5min TTL, health checks every 60s
 *
 * 3. RPC SERVICE (via SupabaseRpcService.rpc):
 *    - Wraps RPC calls with retries, caching, instrumentation
 *    - Use for: complex queries (>3 JOINs, >5 round trips, transactions)
 *
 * Quick reference:
 * | Scenario                    | Client      |
 * |-----------------------------|-------------|
 * | Stripe webhook handler      | Admin       |
 * | User fetches properties     | User Pool   |
 * | Dashboard stats (complex)   | RPC Service |
 * | Health check                | Admin       |
 *
 * @see .planning/adr/0004-supabase-client-patterns.md
 */
import type { DynamicModule } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import type { Database } from '@repo/shared/types/supabase'
import { createClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'
import { DocumentsModule } from '../modules/documents/documents.module'
import { MetricsModule } from '../modules/metrics/metrics.module'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { SupabaseCacheService } from './supabase-cache.service'
import { SupabaseHealthService } from './supabase-health.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'
import { SupabaseRpcService } from './supabase-rpc.service'
import { SupabaseService } from './supabase.service'
import { StorageService } from './storage.service'

@Global()
@Module({})
export class SupabaseModule {
	static forRootAsync(): DynamicModule {
		return {
			module: SupabaseModule,
			imports: [ConfigModule, DocumentsModule, MetricsModule],
			providers: [
				{
					provide: SUPABASE_ADMIN_CLIENT,
					useFactory: (config: AppConfigService, logger: AppLogger) => {
						const url = config.getSupabaseUrl()
						const key = config.getSupabaseSecretKey()

						if (!url || !key) {
							throw new Error(
								'Missing Supabase configuration - ensure you run with valid environment variables (e.g. `pnpm dev`) ' +
									'or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
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
						return createClient<Database>(url, key, {
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
				SupabaseCacheService,
				SupabaseInstrumentationService,
				SupabaseRpcService,
				SupabaseHealthService,
				SupabaseService,
				StorageService
			],
			exports: [SUPABASE_ADMIN_CLIENT, SupabaseService, StorageService]
		}
	}
}
