/**
 * Supabase User Client Pool (ADR-0004)
 *
 * Caches per-user Supabase clients to avoid the ~50ms cost of creating
 * new clients per request. Uses the accessToken callback pattern
 * (recommended by Supabase docs) instead of deprecated headers.Authorization.
 *
 * Configuration:
 * - maxPoolSize: 50 (max cached clients)
 * - ttlMs: 5 minutes (client cache duration)
 * - healthCheckIntervalMs: 60 seconds (validates cached tokens)
 *
 * Usage:
 *   const client = this.pool.getClient(userJwtToken);
 *   // client enforces RLS based on user's permissions
 *
 * Metrics exposed:
 * - hits/misses: Cache effectiveness
 * - evictions: Clients removed (TTL, health check failure, max size)
 *
 * @see .planning/adr/0004-supabase-client-patterns.md
 */
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { AppLogger } from '../logger/app-logger.service'

interface CachedClient {
	client: SupabaseClient<Database>
	lastUsed: number
	created_at: number
	lastHealthCheck: number
	healthCheckInFlight?: boolean
}

export interface SupabaseClientPoolMetrics {
	hits: number
	misses: number
	evictions: number
	totalClients: number
}

interface SupabaseUserClientPoolOptions {
	supabaseUrl: string
	supabasePublishableKey: string
	logger: AppLogger
	maxSize?: number
	ttlMs?: number
	cleanupIntervalMs?: number
	healthCheckIntervalMs?: number
	healthCheckTimeoutMs?: number
}

const DEFAULT_MAX_POOL_SIZE = 50
const DEFAULT_TTL = 5 * 60 * 1000
const DEFAULT_CLEANUP_INTERVAL = 60 * 1000
const DEFAULT_HEALTH_CHECK_INTERVAL = 60 * 1000
const DEFAULT_HEALTH_CHECK_TIMEOUT = 2500

export class SupabaseUserClientPool {
	private readonly clients = new Map<string, CachedClient>()
	private readonly metrics: SupabaseClientPoolMetrics = {
		hits: 0,
		misses: 0,
		evictions: 0,
		totalClients: 0
	}

	private readonly maxPoolSize: number
	private readonly ttlMs: number
	private readonly cleanupIntervalMs: number
	private readonly healthCheckIntervalMs: number
	private readonly healthCheckTimeoutMs: number
	private cleanupTimer?: NodeJS.Timeout

	constructor(private readonly options: SupabaseUserClientPoolOptions) {
		this.maxPoolSize = options.maxSize ?? DEFAULT_MAX_POOL_SIZE
		this.ttlMs = options.ttlMs ?? DEFAULT_TTL
		this.cleanupIntervalMs =
			options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL
		this.healthCheckIntervalMs =
			options.healthCheckIntervalMs ?? DEFAULT_HEALTH_CHECK_INTERVAL
		this.healthCheckTimeoutMs =
			options.healthCheckTimeoutMs ?? DEFAULT_HEALTH_CHECK_TIMEOUT
		this.startCleanupTimer()
	}

	getMetrics(): SupabaseClientPoolMetrics {
		return {
			...this.metrics,
			totalClients: this.clients.size
		}
	}

	getClient(userToken: string): SupabaseClient<Database> {
		const tokenKey = userToken.slice(0, 16)
		const cached = this.clients.get(tokenKey)

		if (cached) {
			const now = Date.now()
			if (now - cached.lastUsed > this.ttlMs) {
				this.clients.delete(tokenKey)
				this.metrics.evictions++
			} else {
				cached.lastUsed = now
				this.touch(tokenKey, cached)
				this.maybeRunHealthCheck(tokenKey, cached)
				this.metrics.hits++
				return cached.client
			}
		}

		this.metrics.misses++

		// Use accessToken callback pattern (recommended by Supabase docs)
		// The deprecated global.headers.Authorization pattern doesn't properly
		// integrate with Supabase's internal token handling for RLS
		const client = createClient<Database>(
			this.options.supabaseUrl,
			this.options.supabasePublishableKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				},
				accessToken: async () => userToken
			}
		)

		const now = Date.now()
		this.clients.set(tokenKey, {
			client,
			lastUsed: now,
			created_at: now,
			lastHealthCheck: 0
		})
		const evicted = this.enforceMaxSize()
		if (evicted > 0) {
			this.metrics.evictions += evicted
		}

		this.metrics.totalClients = this.clients.size

		if (this.metrics.misses % 100 === 0) {
			const hitRate =
				(this.metrics.hits / (this.metrics.hits + this.metrics.misses || 1)) *
				100
			this.options.logger.debug(
				`Client pool stats: ${hitRate.toFixed(1)}% hit rate, ${this.clients.size} cached clients, ${this.metrics.evictions} evictions`
			)
		}

		return client
	}

	close(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
		}
		this.clients.clear()
		this.metrics.totalClients = 0
		this.options.logger.debug('Supabase user client pool cleared')
	}

	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(
			() => this.cleanupStaleClients(),
			this.cleanupIntervalMs
		)

		if (this.cleanupTimer.unref) {
			this.cleanupTimer.unref()
		}
	}

	private cleanupStaleClients(): void {
		const now = Date.now()
		let evicted = 0

		for (const [key, cached] of this.clients.entries()) {
			if (now - cached.lastUsed > this.ttlMs) {
				this.clients.delete(key)
				evicted++
			}
		}

		evicted += this.enforceMaxSize()

		if (evicted > 0) {
			this.metrics.evictions += evicted
			this.metrics.totalClients = this.clients.size
			this.options.logger.debug(
				`Client pool cleanup: evicted ${evicted} clients, ${this.clients.size} remaining`
			)
		}
	}

	private touch(key: string, cached: CachedClient): void {
		this.clients.delete(key)
		this.clients.set(key, cached)
	}

	private enforceMaxSize(): number {
		let evicted = 0
		while (this.clients.size > this.maxPoolSize) {
			const oldestKey = this.clients.keys().next().value as string | undefined
			if (!oldestKey) break
			this.clients.delete(oldestKey)
			evicted++
		}
		return evicted
	}

	private maybeRunHealthCheck(key: string, cached: CachedClient): void {
		const now = Date.now()
		if (
			now - cached.lastHealthCheck < this.healthCheckIntervalMs ||
			cached.healthCheckInFlight
		) {
			return
		}

		cached.healthCheckInFlight = true
		void this.checkClientHealth(key, cached)
	}

	private async checkClientHealth(
		key: string,
		cached: CachedClient
	): Promise<void> {
		try {
			const result = await Promise.race([
				cached.client.auth.getUser(),
				new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error('Health check timeout')),
						this.healthCheckTimeoutMs
					)
				)
			])
			if (result && typeof result === 'object' && 'error' in result) {
				const maybeError = (result as { error?: unknown }).error
				if (maybeError) {
					throw maybeError
				}
			}
			cached.lastHealthCheck = Date.now()
		} catch (error) {
			this.clients.delete(key)
			this.metrics.evictions++
			this.metrics.totalClients = this.clients.size
			this.options.logger.debug(
				`Client pool health check failed; evicted client (${key})`,
				{ error: error instanceof Error ? error.message : String(error) }
			)
		} finally {
			cached.healthCheckInFlight = false
		}
	}
}
