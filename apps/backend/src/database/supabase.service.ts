import {
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import {
	SupabaseAuthTokenResolver,
	type ResolvedSupabaseToken
} from './supabase-auth-token.resolver'
import {
	SupabaseUserClientPool,
	type SupabaseClientPoolMetrics
} from './supabase-user-client-pool'

@Injectable()
export class SupabaseService {
	private readonly logger = new Logger(SupabaseService.name)
	private readonly tokenResolver: SupabaseAuthTokenResolver
	private userClientPool?: SupabaseUserClientPool

	constructor(
		@Inject(SUPABASE_ADMIN_CLIENT)
		private readonly adminClient: SupabaseClient<Database>
	) {
		this.logger.debug('SupabaseService initialized with injected admin client')
		this.tokenResolver = new SupabaseAuthTokenResolver(
			process.env.SUPABASE_PROJECT_REF ?? 'bshjmbshupiibfiewpxb'
		)
	}

	getPoolMetrics(): SupabaseClientPoolMetrics {
		return this.userClientPool
			? this.userClientPool.getMetrics()
			: { hits: 0, misses: 0, evictions: 0, totalClients: 0 }
	}
	private getUserClientPool(): SupabaseUserClientPool {
		if (!this.userClientPool) {
			const supabaseUrl = process.env.SUPABASE_URL
			const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY

			if (!supabaseUrl || !supabaseAnonKey) {
				throw new InternalServerErrorException(
					'Authentication service unavailable [SUP-002]'
				)
			}

			this.userClientPool = new SupabaseUserClientPool({
				supabaseUrl,
				supabaseAnonKey,
				logger: this.logger
			})
		}

		return this.userClientPool
	}

	/**
	 * Cleanup method for graceful shutdown
	 * Call this in OnModuleDestroy lifecycle hook
	 */
	onModuleDestroy(): void {
		this.userClientPool?.close()
		this.logger.debug('SupabaseService cleanup complete')
	}

	getAdminClient(): SupabaseClient<Database> {
		if (!this.adminClient) {
			this.logger.error('Supabase admin client not initialized')
			throw new InternalServerErrorException(
				'Database service unavailable [SUP-001]'
			)
		}

		return this.adminClient
	}

	/**
	 * Call a Supabase RPC with retries and exponential backoff for transient failures.
	 * Returns the raw result { data, error } or throws if unrecoverable.
	 */
	async rpcWithRetries(
		fn: string,
		args: Record<string, unknown>,
		attempts = 3,
		backoffMs = 500,
		timeoutMs = 10000
	) {
		const client = this.adminClient
		let lastErr: unknown = null

		function isTransientMessage(msg: string | undefined): boolean {
			if (!msg) return false
			const m = msg.toLowerCase()
			// Common transient indicators: network issues, timeouts, rate limits, service unavailable
			return (
				m.includes('network') ||
				m.includes('timeout') ||
				m.includes('temporar') ||
				m.includes('unavailable') ||
				m.includes('try again') ||
				m.includes('rate limit') ||
				m.includes('429') ||
				m.includes('503')
			)
		}

		for (let i = 0; i < attempts; i++) {
			// Create an AbortController for per-attempt timeout
			const ac = new AbortController()
			let timer: NodeJS.Timeout | undefined
			if (typeof timeoutMs === 'number' && timeoutMs > 0) {
				timer = setTimeout(() => ac.abort(), timeoutMs)
			}

			try {
				// `client.rpc` has a union type for known RPC names; cast to any for dynamic calls
				// and attach an abort signal for the attempt so long-running RPCs time out.
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const rpcBuilder = (client as any).rpc(fn, args)
				// Some versions of the SDK return a builder with `.abortSignal` support.
				const result = rpcBuilder?.abortSignal
					? await rpcBuilder.abortSignal(ac.signal)
					: await rpcBuilder

				if (timer) clearTimeout(timer)

				// If the RPC returned an error object, determine if it's transient.
				const maybeErrorMsg =
					result?.error?.message ??
					(result?.error ? String(result.error) : undefined)
				if (result?.error) {
					// Log transient RPC errors at debug level to avoid noisy WARN logs for
					// retries; callers should decide whether to warn on final failure.
					this.logger.debug(
						`Supabase RPC returned error for ${fn}: ${maybeErrorMsg}`
					)
					if (isTransientMessage(maybeErrorMsg)) {
						// transient - retry with backoff
						lastErr = result.error
						const delay = backoffMs * Math.pow(2, i)
						const jitter = Math.floor(Math.random() * Math.min(1000, delay))
						await new Promise(r => setTimeout(r, delay + jitter))
						continue
					}
					// Non-transient - return immediately
					return result
				}

				// Success
				return result
			} catch (errUnknown) {
				if (timer) clearTimeout(timer)
				lastErr = errUnknown
				const msg =
					errUnknown instanceof Error ? errUnknown.message : String(errUnknown)
				this.logger.debug(
					`Supabase RPC attempt ${i + 1} failed for ${fn}: ${msg}`
				)

				// If this looks transient (abort, network errors, connection resets), retry
				const candidate = errUnknown as unknown
				const nameProp =
					typeof candidate === 'object' && candidate !== null
						? (candidate as Record<string, unknown>)['name']
						: undefined
				const isAbort = nameProp === 'AbortError'
				if (isAbort || isTransientMessage(msg)) {
					const delay = backoffMs * Math.pow(2, i)
					const jitter = Math.floor(Math.random() * Math.min(1000, delay))
					await new Promise(r => setTimeout(r, delay + jitter))
					continue
				}

				// Non-transient thrown error - still backoff a bit and let subsequent attempts run
				await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i)))
			}
		}

		const finalMessage =
			lastErr instanceof Error
				? lastErr.message
				: String(lastErr ?? 'Unknown error')
		return { data: null, error: { message: finalMessage }, attempts }
	}

	/**
	 * Get user-scoped Supabase client with connection pooling
	 * Uses LRU cache to reuse clients for the same token (30-40% memory reduction)
	 *
	 * Performance:
	 * - Cache hit: ~0.1ms (instant return)
	 * - Cache miss: ~2-5ms (client initialization)
	 *
	 * @param userToken JWT access token from user request
	 * @returns User-scoped Supabase client with RLS enabled
	 */
	getUserClient(userToken: string): SupabaseClient<Database> {
		return this.getUserClientPool().getClient(userToken)
	}

	/**
	 * Get authenticated user from request
	 * Uses Supabase's native auth.getUser() method as per official docs
	 * Supports both Authorization header (Bearer token) and SSR cookies
	 */
	async getUser(req: Request): Promise<authUser | null> {
		const startTime = Date.now()
		try {
			const tokenDetails: ResolvedSupabaseToken = this.tokenResolver.resolve(req)
			const token = tokenDetails.token

			if (!token) {
				this.logger.warn('No auth token found in request', {
					endpoint: req.path,
					hasAuthHeader: tokenDetails.authHeaderPresent,
					expectedCookieName: tokenDetails.expectedCookieName,
					availableCookies: tokenDetails.availableCookies,
					cookieKeys: tokenDetails.cookieKeys,
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

			// Use Supabase's native auth.getUser() with the token
			// This sends a request to Supabase Auth server to validate the token
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
				userId: user.id,
				email: user.email,
				endpoint: req.path,
				duration: `${duration}ms`
			})

			// Return the Supabase User directly
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

	async checkConnection(): Promise<{
		status: 'healthy' | 'unhealthy'
		message?: string
	}> {
		try {
			const fn = 'health_check' // Hardcoded health check function name
			try {
				// Explicit any here because RPC name is dynamic and SDK typings are
				// narrow; accept the cast for runtime call.
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const result = await (this.adminClient as any).rpc(fn)
				const { data, error } = result
				if (!error && data && typeof data === 'object') {
					const dataArray = data as unknown[]
					if (Array.isArray(dataArray) && dataArray.length > 0) {
						const ok = (dataArray[0] as { ok?: boolean })?.ok ?? true
						if (ok) {
							this.logger?.debug({ fn }, 'Supabase RPC health ok')
							return { status: 'healthy' }
						}
					}
				}
				if (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error)
					this.logger?.warn(
						{ error: errorMessage, fn },
						'Supabase RPC health failed; falling back to table ping'
					)
				}
			} catch (rpcErr) {
				// RPC not available; continue to table ping
				this.logger?.debug(
					{
						fn,
						rpcErr: rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
					},
					'RPC health not available; using table ping'
				)
			}

			// Connectivity check: lightweight HEAD count on a canonical table.
			const table = 'users' // Use users table for health check
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { error } = await (this.adminClient as any)
				.from(table)
				.select('*', { count: 'exact', head: true })

			if (error) {
				interface SupabaseError {
					message?: string
					details?: string
					hint?: string
					code?: string
				}
				const message =
					error instanceof Error
						? error.message
						: (error as SupabaseError)?.message ||
							(error as SupabaseError)?.details ||
							(error as SupabaseError)?.hint ||
							(error as SupabaseError)?.code ||
							JSON.stringify(error)
				this.logger?.error({ error, table }, 'Supabase table ping failed')
				return { status: 'unhealthy', message }
			}

			this.logger?.debug({ table }, 'Supabase table ping ok')
			return { status: 'healthy' }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			this.logger?.error(
				{ error: message },
				'Supabase connectivity check threw'
			)
			return { status: 'unhealthy', message }
		}
	}
}
