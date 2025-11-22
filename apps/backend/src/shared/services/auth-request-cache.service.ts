import { Injectable, Scope } from '@nestjs/common'

/**
 * Request-scoped auth cache to avoid repeated database lookups inside guards
 * and interceptors. Stores simple key/value pairs for the lifetime of a single
 * HTTP request.
 */
@Injectable({ scope: Scope.REQUEST })
export class AuthRequestCache {
	private readonly store = new Map<string, unknown>()

	get<T>(key: string): T | undefined {
		return this.store.get(key) as T | undefined
	}

	set<T>(key: string, value: T): T {
		this.store.set(key, value)
		return value
	}

	/**
	 * Return cached value when present, otherwise execute the factory once,
	 * cache its result, and return it.
	 */
	async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
		if (this.store.has(key)) {
			return this.store.get(key) as T
		}
		const value = await factory()
		this.store.set(key, value)
		return value
	}
}
