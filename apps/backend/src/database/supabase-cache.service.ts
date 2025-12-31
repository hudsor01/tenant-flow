import { Injectable, Optional } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { RedisCacheService } from '../cache/cache.service'

export type CacheTier = 'short' | 'medium' | 'long'

type CacheOptions = {
	tier?: CacheTier
	ttlMs?: number
}

@Injectable()
export class SupabaseCacheService {
	constructor(@Optional() private readonly cache?: RedisCacheService) {}

	isEnabled(): boolean {
		return !!this.cache
	}

	async get<T>(key: string): Promise<T | null> {
		if (!this.cache) return null
		return this.cache.get<T>(key)
	}

	async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
		if (!this.cache) return
		await this.cache.set(key, value, options)
	}

	buildRpcCacheKey(
		fn: string,
		args: Record<string, unknown>,
		overrideKey?: string
	): string {
		if (overrideKey) return overrideKey
		const hash = createHash('sha1')
			.update(this.stableStringify(args))
			.digest('hex')
		return `supabase:rpc:${fn}:${hash}`
	}

	private stableStringify(value: unknown): string {
		if (value === null || typeof value !== 'object') {
			return JSON.stringify(value)
		}

		if (Array.isArray(value)) {
			return `[${value.map(item => this.stableStringify(item)).join(',')}]`
		}

		const entries = Object.entries(value as Record<string, unknown>).sort(
			([a], [b]) => a.localeCompare(b)
		)

		return `{${entries
			.map(
				([key, val]) => `${JSON.stringify(key)}:${this.stableStringify(val)}`
			)
			.join(',')}}`
	}
}
