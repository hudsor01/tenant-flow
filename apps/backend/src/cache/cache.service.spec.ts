/**
 * RedisCacheService TDD Tests
 * Tests cache hit/miss behavior, TTL expiration, and surgical invalidation
 * Following CLAUDE.md: Test production usage, not every hook
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { RedisCacheService } from './cache.service'
import { SilentLogger } from '../__tests__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'
import { AppConfigService } from '../config/app-config.service'
import { MODULE_OPTIONS_TOKEN } from './cache.module-definition'

describe('RedisCacheService', () => {
	let service: RedisCacheService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RedisCacheService,
				{
					provide: MODULE_OPTIONS_TOKEN,
					useValue: {
						ttlShortMs: 30_000,
						ttlMediumMs: 5 * 60 * 1000,
						ttlLongMs: 30 * 60 * 1000,
						keyPrefix: 'test-cache'
					}
				},
				{
					provide: AppConfigService,
					useValue: {
						getRedisConfig: jest.fn().mockReturnValue({})
					}
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<RedisCacheService>(RedisCacheService)
	})

	afterEach(() => {
		service.onModuleDestroy()
	})

	describe('Cache Hit/Miss Behavior', () => {
		it('should return null for cache miss', async () => {
			const result = await service.get<string>('nonexistent-key')
			expect(result).toBeNull()
		})

		it('should return cached data for cache hit', async () => {
			const testData = { id: '123', name: 'Test Property' }
			await service.set('properties:123', testData)

			const result = await service.get<typeof testData>('properties:123')
			expect(result).toEqual(testData)
		})

		it('should increment hit count on cache hit', async () => {
			await service.set('test-key', 'test-value')
			await service.get('test-key')

			const stats = service.getStats()
			expect(stats.hits).toBe(1)
			expect(stats.misses).toBe(0)
		})

		it('should increment miss count on cache miss', async () => {
			await service.get('nonexistent-key')

			const stats = service.getStats()
			expect(stats.hits).toBe(0)
			expect(stats.misses).toBe(1)
		})
	})

	describe('TTL Expiration', () => {
		it('should return null for expired entries', async () => {
			// Set with very short TTL (1ms)
			await service.set('short-lived', 'value', { ttlMs: 1 })

			// Wait for expiration
			const start = Date.now()
			while (Date.now() - start < 5) {
				// Busy wait to ensure TTL expires
			}

			const result = await service.get('short-lived')
			expect(result).toBeNull()
		})

		it('should return data within TTL', async () => {
			// Set with 5 second TTL
			await service.set('long-lived', 'value', { ttlMs: 5000 })

			const result = await service.get('long-lived')
			expect(result).toBe('value')
		})

		it('should use default TTL of 5 minutes when not specified', async () => {
			await service.set('default-ttl', 'value')

			// Should still be valid immediately
			const result = await service.get('default-ttl')
			expect(result).toBe('value')
		})
	})

	describe('Surgical Invalidation', () => {
		beforeEach(async () => {
			// Setup test data
			await service.set('user:abc:properties', [{ id: '1' }], {
				ttlMs: 300_000,
				tags: ['user:abc', 'properties']
			})
			await service.set('user:abc:leases', [{ id: '2' }], {
				ttlMs: 300_000,
				tags: ['user:abc', 'leases']
			})
			await service.set('user:xyz:properties', [{ id: '3' }], {
				ttlMs: 300_000,
				tags: ['user:xyz', 'properties']
			})
			await service.set(
				'properties:1',
				{ name: 'Prop 1' },
				{ ttlMs: 300_000, tags: ['properties'] }
			)
			await service.set(
				'properties:2',
				{ name: 'Prop 2' },
				{ ttlMs: 300_000, tags: ['properties'] }
			)
		})

		it('should invalidate by exact pattern', async () => {
			const count = await service.invalidate('properties:1')

			expect(count).toBe(1)
			expect(await service.get('properties:1')).toBeNull()
			expect(await service.get('properties:2')).not.toBeNull()
		})

		it('should invalidate by pattern substring', async () => {
			// Invalidate all entries containing 'user:abc'
			const count = await service.invalidate('user:abc')

			expect(count).toBe(2)
			expect(await service.get('user:abc:properties')).toBeNull()
			expect(await service.get('user:abc:leases')).toBeNull()
			expect(await service.get('user:xyz:properties')).not.toBeNull()
		})

		it('should invalidate by dependency', async () => {
			// Invalidate all entries with 'properties' dependency
			const count = await service.invalidate('properties')

			expect(count).toBeGreaterThanOrEqual(4) // All entries with 'properties' dependency
		})

		it('should invalidate by regex pattern', async () => {
			const count = await service.invalidate(/^user:.*:properties$/)

			expect(count).toBe(2) // user:abc:properties and user:xyz:properties
			expect(await service.get('user:abc:properties')).toBeNull()
			expect(await service.get('user:xyz:properties')).toBeNull()
			expect(await service.get('user:abc:leases')).not.toBeNull()
		})

		it('should increment invalidation count', async () => {
			await service.invalidate('properties:1')

			const stats = service.getStats()
			expect(stats.invalidations).toBe(1)
		})
	})

	describe('Entity-Based Invalidation', () => {
		beforeEach(async () => {
			await service.set(
				'properties:123:details',
				{ name: 'Test' },
				{ ttlMs: 300_000, tags: ['properties:123'] }
			)
			await service.set('properties:123:units', [{ id: '1' }], {
				ttlMs: 300_000,
				tags: ['properties:123']
			})
			await service.set(
				'properties:456:details',
				{ name: 'Other' },
				{ ttlMs: 300_000, tags: ['properties:456'] }
			)
		})

		it('should invalidate by entity type and id', async () => {
			const count = await service.invalidateByEntity('properties', '123')

			expect(count).toBe(2) // Both entries for property 123
			expect(await service.get('properties:123:details')).toBeNull()
			expect(await service.get('properties:123:units')).toBeNull()
			expect(await service.get('properties:456:details')).not.toBeNull()
		})

		it('should invalidate all entities of type when no id provided', async () => {
			const count = await service.invalidateByEntity('properties')

			expect(count).toBe(3) // All property entries
		})
	})

	describe('User-Based Invalidation', () => {
		beforeEach(async () => {
			await service.set(
				'user:user123:dashboard',
				{ stats: {} },
				{ ttlMs: 300_000, tags: ['user:user123'] }
			)
			await service.set('user:user123:properties', [], {
				ttlMs: 300_000,
				tags: ['user:user123']
			})
			await service.set(
				'user:user456:dashboard',
				{ stats: {} },
				{ ttlMs: 300_000, tags: ['user:user456'] }
			)
		})

		it('should invalidate all cache entries for a specific user', async () => {
			const count = await service.invalidateByUser('user123')

			expect(count).toBe(2)
			expect(await service.get('user:user123:dashboard')).toBeNull()
			expect(await service.get('user:user123:properties')).toBeNull()
			expect(await service.get('user:user456:dashboard')).not.toBeNull()
		})
	})

	describe('Cache Key Generation', () => {
		it('should generate user-specific cache keys', () => {
			const key = RedisCacheService.getUserKey(
				'user123',
				'properties:findAll',
				{ limit: 10 }
			)
			expect(key).toBe('user:user123:properties:findAll:{"limit":10}')
		})

		it('should generate user key without params', () => {
			const key = RedisCacheService.getUserKey('user123', 'dashboard:stats')
			expect(key).toBe('user:user123:dashboard:stats')
		})

		it('should generate entity-specific cache keys', () => {
			const key = RedisCacheService.getEntityKey('properties', '123', 'details')
			expect(key).toBe('properties:123:details')
		})

		it('should generate entity key without operation', () => {
			const key = RedisCacheService.getEntityKey('properties', '123')
			expect(key).toBe('properties:123')
		})
	})

	describe('Cache Clear', () => {
		it('should clear all cache entries', async () => {
			await service.set('key1', 'value1')
			await service.set('key2', 'value2')
			await service.set('key3', 'value3')

			await service.clear()

			expect(await service.get('key1')).toBeNull()
			expect(await service.get('key2')).toBeNull()
			expect(await service.get('key3')).toBeNull()
		})

		it('should increment invalidation count when clearing', async () => {
			await service.set('key1', 'value1')
			await service.set('key2', 'value2')

			await service.clear()

			const stats = service.getStats()
			expect(stats.invalidations).toBe(2)
		})
	})

	describe('Health Check', () => {
		it('should report healthy when within limits', () => {
			// Fresh service should be healthy (hit ratio check bypassed for empty cache)
			const health = service.isHealthy()
			expect(health.details.isWithinMemoryLimit).toBe(true)
		})

		it('should include cache statistics in health details', async () => {
			await service.set('test', 'value')
			await service.get('test') // hit
			await service.get('nonexistent') // miss

			const health = service.isHealthy()
			expect(health.details.hits).toBeDefined()
			expect(health.details.misses).toBeDefined()
			expect(health.details.entries).toBeDefined()
		})
	})
})
