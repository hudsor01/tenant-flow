import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
	RPC_BACKOFF_MS,
	RPC_MAX_RETRIES,
	RPC_TIMEOUT_MS
} from './supabase.constants'
import { AppLogger } from '../logger/app-logger.service'
import { SupabaseCacheService, type CacheTier } from './supabase-cache.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'

type RpcFunctionName = keyof Database['public']['Functions']
type RpcFunctionArgs<T extends RpcFunctionName> =
	Database['public']['Functions'][T]['Args']

type RpcAttemptResult<T> = {
	data: T | null
	error: { message: string } | null
	attempts: number
}

type RpcOptions = {
	/** Maximum retry attempts (default: 3) */
	maxAttempts?: number
	/** Backoff delay in ms (default: 500) */
	backoffMs?: number
	/** Request timeout in ms (default: 10000) */
	timeoutMs?: number
	/** Enable caching */
	cache?: boolean
	/** Custom cache key (auto-generated if not provided) */
	cacheKey?: string
	/** Cache tier: 'short' | 'medium' | 'long' */
	cacheTier?: CacheTier
	/** Custom cache TTL in ms */
	cacheTtlMs?: number
}

type RpcBuilder<T> = Promise<{
	data: T | null
	error?: { message?: string } | null
}> & {
	abortSignal?: (
		signal: AbortSignal
	) => Promise<{ data: T | null; error?: { message?: string } | null }>
}

@Injectable()
export class SupabaseRpcService {
	constructor(
		private readonly logger: AppLogger,
		private readonly cacheService: SupabaseCacheService,
		private readonly instrumentation: SupabaseInstrumentationService
	) {}

	/**
	 * Execute an RPC call with automatic retries, caching, and instrumentation
	 */
	async rpc<T extends RpcFunctionName>(
		client: SupabaseClient<Database>,
		fn: T,
		args: RpcFunctionArgs<T>,
		options?: RpcOptions
	): Promise<RpcAttemptResult<Database['public']['Functions'][T]['Returns']>>
	async rpc<T = unknown>(
		client: SupabaseClient<Database>,
		fn: string,
		args: Record<string, unknown>,
		options?: RpcOptions
	): Promise<RpcAttemptResult<T>>
	async rpc<T = unknown>(
		client: SupabaseClient<Database>,
		fn: string,
		args: Record<string, unknown>,
		options: RpcOptions = {}
	): Promise<RpcAttemptResult<T>> {
		const {
			maxAttempts = RPC_MAX_RETRIES,
			backoffMs = RPC_BACKOFF_MS,
			timeoutMs = RPC_TIMEOUT_MS,
			cache = false,
			cacheKey: customCacheKey,
			cacheTier,
			cacheTtlMs
		} = options

		const cacheEnabled = cache && this.cacheService.isEnabled()
		const cacheKey = cacheEnabled
			? this.cacheService.buildRpcCacheKey(fn, args, customCacheKey)
			: null
		const startTime = Date.now()
		let lastErr: unknown = null
		let attemptCount = 0

		// Check cache first
		if (cacheEnabled && cacheKey) {
			const cached = await this.cacheService.get<T>(cacheKey)
			if (cached !== null) {
				this.instrumentation.recordRpcCacheHit(fn)
				this.instrumentation.recordRpcCall(fn, 0, 'cache')
				return { data: cached, error: null, attempts: 0 }
			}
			this.instrumentation.recordRpcCacheMiss(fn)
		}

		// Retry loop
		for (let i = 0; i < maxAttempts; i++) {
			attemptCount = i + 1
			const ac = new AbortController()
			const timer =
				timeoutMs > 0 ? setTimeout(() => ac.abort(), timeoutMs) : undefined

			try {
				const rpcBuilder = client.rpc(
					fn as RpcFunctionName,
					args as RpcFunctionArgs<RpcFunctionName>
				) as unknown as RpcBuilder<T>

				const result = rpcBuilder?.abortSignal
					? await rpcBuilder.abortSignal(ac.signal)
					: await rpcBuilder

				if (timer) clearTimeout(timer)

				// Handle RPC error response
				if (result.error) {
					const errorMsg = result.error.message ?? String(result.error)
					this.logger.debug(`Supabase RPC error for ${fn}: ${errorMsg}`)

					if (this.isTransientError(errorMsg)) {
						lastErr = result.error
						await this.backoff(backoffMs, i)
						continue
					}

					this.recordRpcMetrics(fn, startTime, 'error')
					return {
						data: result.data ?? null,
						error: { message: errorMsg },
						attempts: attemptCount
					}
				}

				// Success - cache and return
				this.recordRpcMetrics(fn, startTime, 'success')

				if (cacheEnabled && cacheKey && result.data !== null) {
					await this.cacheService.set(cacheKey, result.data, {
						...(cacheTier && { tier: cacheTier }),
						...(cacheTtlMs && { ttlMs: cacheTtlMs })
					})
				}

				return { data: result.data ?? null, error: null, attempts: attemptCount }
			} catch (err) {
				if (timer) clearTimeout(timer)
				lastErr = err
				const msg = err instanceof Error ? err.message : String(err)
				this.logger.debug(`Supabase RPC attempt ${attemptCount} failed: ${msg}`)

				const isAbort =
					typeof err === 'object' &&
					err !== null &&
					(err as { name?: string }).name === 'AbortError'

				if (isAbort || this.isTransientError(msg)) {
					await this.backoff(backoffMs, i)
					continue
				}
				break
			}
		}

		// All retries exhausted
		const finalMessage =
			lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Unknown')
		this.recordRpcMetrics(fn, startTime, 'error')
		return { data: null, error: { message: finalMessage }, attempts: attemptCount }
	}

	/**
	 * Convenience method for RPC with caching enabled
	 */
	async rpcWithCache<T extends RpcFunctionName>(
		client: SupabaseClient<Database>,
		fn: T,
		args: RpcFunctionArgs<T>,
		options?: Omit<RpcOptions, 'cache'>
	): Promise<RpcAttemptResult<Database['public']['Functions'][T]['Returns']>>
	async rpcWithCache<T = unknown>(
		client: SupabaseClient<Database>,
		fn: string,
		args: Record<string, unknown>,
		options?: Omit<RpcOptions, 'cache'>
	): Promise<RpcAttemptResult<T>>
	async rpcWithCache<T = unknown>(
		client: SupabaseClient<Database>,
		fn: string,
		args: Record<string, unknown>,
		options?: Omit<RpcOptions, 'cache'>
	): Promise<RpcAttemptResult<T>> {
		return this.rpc<T>(client, fn, args, { ...options, cache: true })
	}

	/**
	 * @deprecated Use rpc() instead. Will be removed in next major version.
	 */
	async rpcWithRetries<T = unknown>(
		client: SupabaseClient<Database>,
		fn: string,
		args: Record<string, unknown>,
		maxAttempts?: number,
		backoffMs?: number,
		timeoutMs?: number,
		options?: { cache?: boolean; cacheKey?: string; cacheTier?: CacheTier; cacheTtlMs?: number }
	): Promise<RpcAttemptResult<T>> {
		return this.rpc<T>(client, fn, args, {
			...(maxAttempts !== undefined && { maxAttempts }),
			...(backoffMs !== undefined && { backoffMs }),
			...(timeoutMs !== undefined && { timeoutMs }),
			...options
		})
	}

	private isTransientError(msg: string): boolean {
		const m = msg.toLowerCase()
		return (
			m.includes('network') ||
			m.includes('timeout') ||
			m.includes('temporar') ||
			m.includes('unavailable') ||
			m.includes('try again') ||
			m.includes('rate limit') ||
			m.includes('429') ||
			m.includes('503') ||
			m.includes('econnreset') ||
			m.includes('econnrefused') ||
			m.includes('etimedout') ||
			m.includes('connection reset')
		)
	}

	private async backoff(baseMs: number, attempt: number): Promise<void> {
		const delay = baseMs * Math.pow(2, attempt)
		const jitter = Math.floor(Math.random() * Math.min(1000, delay))
		await new Promise(r => setTimeout(r, delay + jitter))
	}

	private recordRpcMetrics(
		fn: string,
		startTime: number,
		status: 'success' | 'error' | 'cache'
	): void {
		this.instrumentation.trackQuery('rpc', fn)
		this.instrumentation.recordRpcCall(fn, Date.now() - startTime, status)
	}
}

export type { RpcAttemptResult, RpcOptions, RpcFunctionArgs, RpcFunctionName }
