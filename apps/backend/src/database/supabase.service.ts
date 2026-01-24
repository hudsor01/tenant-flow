import type { OnModuleDestroy } from '@nestjs/common'
import {
	Inject,
	Injectable,
	InternalServerErrorException,
	Optional
} from '@nestjs/common'
import type { AuthUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'
import { SUPABASE_ADMIN_CLIENT, SUPABASE_ERROR_CODES } from './supabase.constants'
import {
	SupabaseAuthTokenResolver,
	type ResolvedSupabaseToken
} from './supabase-auth-token.resolver'
import {
	SupabaseUserClientPool,
	type SupabaseClientPoolMetrics
} from './supabase-user-client-pool'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'
import { MetricsService } from '../modules/metrics/metrics.service'
import {
	SupabaseRpcService,
	type RpcOptions,
	type RpcFunctionArgs,
	type RpcFunctionName
} from './supabase-rpc.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'
import {
	SupabaseHealthService,
	type HealthCheckResponse
} from './supabase-health.service'

@Injectable()
export class SupabaseService implements OnModuleDestroy {
	private readonly tokenResolver: SupabaseAuthTokenResolver
	private userClientPool?: SupabaseUserClientPool
	private lastPoolMetrics?: SupabaseClientPoolMetrics

	constructor(
		@Inject(SUPABASE_ADMIN_CLIENT)
		private readonly adminClient: SupabaseClient<Database>,
		private readonly logger: AppLogger,
		private readonly config: AppConfigService,
		private readonly rpcService: SupabaseRpcService,
		private readonly instrumentation: SupabaseInstrumentationService,
		private readonly healthService: SupabaseHealthService,
		@Optional() private readonly metrics?: MetricsService
	) {
		this.logger.debug('SupabaseService initialized with injected admin client')
		this.tokenResolver = new SupabaseAuthTokenResolver(
			this.config.getSupabaseProjectRef()
		)
	}

	getPoolMetrics(): SupabaseClientPoolMetrics {
		return this.userClientPool
			? this.userClientPool.getMetrics()
			: { hits: 0, misses: 0, evictions: 0, totalClients: 0 }
	}

	private getUserClientPool(): SupabaseUserClientPool {
		if (!this.userClientPool) {
			const supabaseUrl = this.config.getSupabaseUrl()
			const supabasePublishableKey = this.config.getSupabasePublishableKey()

			if (!supabaseUrl || !supabasePublishableKey) {
				this.logger.error(
					`[${SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE}] User client pool initialization failed`,
					{
						errorCode: SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE,
						context: 'getUserClientPool',
						hasPublishableKey: !!supabasePublishableKey,
						url: (supabaseUrl || '').substring(0, 35),
						keyPrefix: supabasePublishableKey
							? supabasePublishableKey.substring(0, 10) + '...'
							: undefined
					}
				)
				throw new InternalServerErrorException(
					`Authentication service unavailable [${SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE}]`
				)
			}

			this.logger.debug('Initializing user client pool', {
				url: supabaseUrl.substring(0, 35),
				keyPrefix: supabasePublishableKey.substring(0, 20)
			})

			this.userClientPool = new SupabaseUserClientPool({
				supabaseUrl,
				supabasePublishableKey,
				logger: this.logger
			})
		}

		return this.userClientPool
	}

	onModuleDestroy(): void {
		this.userClientPool?.close()
		this.logger.debug('SupabaseService cleanup complete')
	}

	getAdminClient(): SupabaseClient<Database> {
		if (!this.adminClient) {
			this.logger.error(
				`[${SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE}] Supabase admin client not initialized`,
				{
					errorCode: SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE,
					context: 'getAdminClient'
				}
			)
			throw new InternalServerErrorException(
				`Database service unavailable [${SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE}]`
			)
		}

		return this.instrumentation.instrumentClient(this.adminClient, 'admin')
	}

	/**
	 * Execute an RPC call with automatic retries, caching, and instrumentation
	 *
	 * Use this method for complex queries (>3 JOINs, >5 round trips, transactions).
	 * For simple CRUD, use getAdminClient().from(...) directly.
	 *
	 * @example
	 * // With caching
	 * const result = await this.supabaseService.rpc('get_dashboard_stats', {
	 *   user_id: userId
	 * }, { cache: true, cacheTier: 'short' });
	 *
	 * // With retries only
	 * const result = await this.supabaseService.rpc('update_user_settings', {
	 *   user_id: userId,
	 *   settings: newSettings
	 * }, { maxAttempts: 5, backoffMs: 1000 });
	 */
	async rpc<T extends RpcFunctionName>(
		fn: T,
		args: RpcFunctionArgs<T>,
		options?: RpcOptions
	): Promise<{
		data: unknown
		error?: { message?: string } | null | undefined
		attempts: number
	}>
	async rpc(
		fn: string,
		args: Record<string, unknown>,
		options?: RpcOptions
	): Promise<{
		data: unknown
		error?: { message?: string } | null | undefined
		attempts: number
	}>
	async rpc(
		fn: string,
		args: Record<string, unknown>,
		options?: RpcOptions
	) {
		return this.rpcService.rpc(this.adminClient, fn, args, options)
	}

	/**
	 * @deprecated Use rpc() instead. Will be removed in next major version.
	 */
	async rpcWithRetries<T extends RpcFunctionName>(
		fn: T,
		args: RpcFunctionArgs<T>,
		maxAttempts?: number,
		backoffMs?: number,
		timeoutMs?: number,
		options?: Omit<RpcOptions, 'maxAttempts' | 'backoffMs' | 'timeoutMs'>
	): Promise<{
		data: unknown
		error?: { message?: string } | null | undefined
		attempts: number
	}>
	async rpcWithRetries(
		fn: string,
		args: Record<string, unknown>,
		maxAttempts?: number,
		backoffMs?: number,
		timeoutMs?: number,
		options?: Omit<RpcOptions, 'maxAttempts' | 'backoffMs' | 'timeoutMs'>
	): Promise<{
		data: unknown
		error?: { message?: string } | null | undefined
		attempts: number
	}>
	async rpcWithRetries(
		fn: string,
		args: Record<string, unknown>,
		maxAttempts?: number,
		backoffMs?: number,
		timeoutMs?: number,
		options?: Omit<RpcOptions, 'maxAttempts' | 'backoffMs' | 'timeoutMs'>
	) {
		return this.rpcService.rpc(this.adminClient, fn, args, {
			...(maxAttempts !== undefined && { maxAttempts }),
			...(backoffMs !== undefined && { backoffMs }),
			...(timeoutMs !== undefined && { timeoutMs }),
			...options
		})
	}

	async rpcWithCache<T extends RpcFunctionName>(
		fn: T,
		args: RpcFunctionArgs<T>,
		options?: Omit<RpcOptions, 'cache'>
	): Promise<{
		data: unknown
		error?: { message?: string } | null | undefined
		attempts: number
	}>
	async rpcWithCache(
		fn: string,
		args: Record<string, unknown>,
		options?: Omit<RpcOptions, 'cache'>
	): Promise<{
		data: unknown
		error?: { message?: string } | null | undefined
		attempts: number
	}>
	async rpcWithCache(
		fn: string,
		args: Record<string, unknown>,
		options?: Omit<RpcOptions, 'cache'>
	) {
		return this.rpcService.rpcWithCache(this.adminClient, fn, args, options)
	}

	getUserClient(userToken: string): SupabaseClient<Database> {
		const client = this.getUserClientPool().getClient(userToken)
		this.recordPoolMetrics()
		return this.instrumentation.instrumentClient(client, 'user')
	}

	getTokenFromRequest(request: Request): string | null {
		const authHeader = request.headers?.authorization
		if (authHeader && typeof authHeader === 'string') {
			const match = authHeader.match(/^Bearer\s+(.+)$/i)
			if (match?.[1]) {
				return match[1]
			}
		}
		return null
	}

	async getUser(req: Request): Promise<AuthUser | null> {
		const startTime = Date.now()
		try {
			const reqWithCache = req as Request & { authUserCache?: AuthUser | null }
			if (typeof reqWithCache.authUserCache !== 'undefined') {
				return reqWithCache.authUserCache
			}

			const guardUser = (req as Request & { user?: AuthUser }).user
			if (guardUser) {
				reqWithCache.authUserCache = guardUser
				return guardUser
			}

			const tokenDetails: ResolvedSupabaseToken =
				this.tokenResolver.resolve(req)
			const token = tokenDetails.token

			if (!token) {
				this.logger.warn('No auth token found in request', {
					endpoint: req.path,
					hasAuthHeader: tokenDetails.authHeaderPresent,
					expectedCookieName: tokenDetails.expectedCookieName,
					headers: {
						origin: req.headers.origin,
						referer: req.headers.referer
					}
				})
				return null
			}

			this.logger.debug('Authentication token resolved', {
				endpoint: req.path,
				method: req.method,
				source: tokenDetails.source,
				cookieKeys: tokenDetails.cookieKeys
			})

			const {
				data: { user },
				error
			} = await this.adminClient.auth.getUser(token)

			if (error || !user) {
				this.logger.warn('Token validation failed via auth.getUser()', {
					error: error?.message,
					errorCode: error?.code,
					endpoint: req.path,
					tokenLength: token?.length
				})
				return null
			}

			const duration = Date.now() - startTime
			this.logger.log('User authenticated successfully', {
				user_id: user.id,
				endpoint: req.path,
				duration: `${duration}ms`
			})

			reqWithCache.authUserCache = user
			return user
		} catch (error) {
			const duration = Date.now() - startTime
			this.logger.error('Error in getUser()', {
				error: error instanceof Error ? error.message : String(error),
				stack:
					error instanceof Error
						? error.stack?.split('\n').slice(0, 3).join('\n')
						: undefined,
				endpoint: req.path,
				duration: `${duration}ms`
			})
			return null
		}
	}

	async checkConnection(): Promise<HealthCheckResponse> {
		return this.healthService.checkConnection()
	}

	private recordPoolMetrics(): void {
		if (!this.metrics) return
		const current = this.getPoolMetrics()
		this.metrics.setSupabaseUserClientPoolSize(current.totalClients)

		if (!this.lastPoolMetrics) {
			this.lastPoolMetrics = current
			return
		}

		const hitDelta = current.hits - this.lastPoolMetrics.hits
		const missDelta = current.misses - this.lastPoolMetrics.misses
		const evictionDelta = current.evictions - this.lastPoolMetrics.evictions

		if (hitDelta > 0) this.metrics.recordSupabaseUserClientPoolHits(hitDelta)
		if (missDelta > 0)
			this.metrics.recordSupabaseUserClientPoolMisses(missDelta)
		if (evictionDelta > 0)
			this.metrics.recordSupabaseUserClientPoolEvictions(evictionDelta)

		this.lastPoolMetrics = current
	}
}
