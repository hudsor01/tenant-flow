import { Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

interface CachedClient {
	client: SupabaseClient<Database>
	lastUsed: number
	createdAt: number
}

export interface SupabaseClientPoolMetrics {
	hits: number
	misses: number
	evictions: number
	totalClients: number
}

interface SupabaseUserClientPoolOptions {
	supabaseUrl: string
	supabaseAnonKey: string
	logger: Logger
	maxSize?: number
	ttlMs?: number
	cleanupIntervalMs?: number
}

const DEFAULT_MAX_POOL_SIZE = 100
const DEFAULT_TTL = 5 * 60 * 1000
const DEFAULT_CLEANUP_INTERVAL = 60 * 1000

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
	private cleanupTimer?: NodeJS.Timeout

	constructor(private readonly options: SupabaseUserClientPoolOptions) {
		this.maxPoolSize = options.maxSize ?? DEFAULT_MAX_POOL_SIZE
		this.ttlMs = options.ttlMs ?? DEFAULT_TTL
		this.cleanupIntervalMs = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL
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
			cached.lastUsed = Date.now()
			this.metrics.hits++
			return cached.client
		}

		this.metrics.misses++
		const client = createClient<Database>(
			this.options.supabaseUrl,
			this.options.supabaseAnonKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				},
				global: {
					headers: {
						Authorization: `Bearer ${userToken}`
					}
				}
			}
		)

		const now = Date.now()
		this.clients.set(tokenKey, {
			client,
			lastUsed: now,
			createdAt: now
		})

		this.metrics.totalClients = this.clients.size

		if (this.metrics.misses % 100 === 0) {
			const hitRate =
				(this.metrics.hits /
					(this.metrics.hits + this.metrics.misses || 1)) *
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

		if (this.clients.size > this.maxPoolSize) {
			const entries = Array.from(this.clients.entries()).sort(
				([, a], [, b]) => a.lastUsed - b.lastUsed
			)

			const toRemove = this.clients.size - this.maxPoolSize
			for (let i = 0; i < toRemove; i++) {
				const entry = entries[i]
				if (entry) {
					this.clients.delete(entry[0])
					evicted++
				}
			}
		}

		if (evicted > 0) {
			this.metrics.evictions += evicted
			this.metrics.totalClients = this.clients.size
			this.options.logger.debug(
				`Client pool cleanup: evicted ${evicted} clients, ${this.clients.size} remaining`
			)
		}
	}
}
