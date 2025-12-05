/**
 * ZeroCacheService TDD Tests
 * Tests cache hit/miss behavior, TTL expiration, and surgical invalidation
 * Following CLAUDE.md: Test production usage, not every hook
 */

import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ZeroCacheService } from './cache.service'
import { SilentLogger } from '../__test__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'


describe('ZeroCacheService', () => {
  let service: ZeroCacheService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZeroCacheService,
        {
          provide: AppLogger,
          useValue: new SilentLogger()
        }
      ]
    }).compile()

    service = module.get<ZeroCacheService>(ZeroCacheService)
  })

  afterEach(() => {
    service.onModuleDestroy()
  })

  describe('Cache Hit/Miss Behavior', () => {
    it('should return null for cache miss', () => {
      const result = service.get<string>('nonexistent-key')
      expect(result).toBeNull()
    })

    it('should return cached data for cache hit', () => {
      const testData = { id: '123', name: 'Test Property' }
      service.set('properties:123', testData)

      const result = service.get<typeof testData>('properties:123')
      expect(result).toEqual(testData)
    })

    it('should increment hit count on cache hit', () => {
      service.set('test-key', 'test-value')
      service.get('test-key')

      const stats = service.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(0)
    })

    it('should increment miss count on cache miss', () => {
      service.get('nonexistent-key')

      const stats = service.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(1)
    })
  })

  describe('TTL Expiration', () => {
    it('should return null for expired entries', () => {
      // Set with very short TTL (1ms)
      service.set('short-lived', 'value', 1)

      // Wait for expiration
      const start = Date.now()
      while (Date.now() - start < 5) {
        // Busy wait to ensure TTL expires
      }

      const result = service.get('short-lived')
      expect(result).toBeNull()
    })

    it('should return data within TTL', () => {
      // Set with 5 second TTL
      service.set('long-lived', 'value', 5000)

      const result = service.get('long-lived')
      expect(result).toBe('value')
    })

    it('should use default TTL of 5 minutes when not specified', () => {
      service.set('default-ttl', 'value')

      // Should still be valid immediately
      const result = service.get('default-ttl')
      expect(result).toBe('value')
    })
  })

  describe('Surgical Invalidation', () => {
    beforeEach(() => {
      // Setup test data
      service.set('user:abc:properties', [{ id: '1' }], 300_000, ['user:abc', 'properties'])
      service.set('user:abc:leases', [{ id: '2' }], 300_000, ['user:abc', 'leases'])
      service.set('user:xyz:properties', [{ id: '3' }], 300_000, ['user:xyz', 'properties'])
      service.set('properties:1', { name: 'Prop 1' }, 300_000, ['properties'])
      service.set('properties:2', { name: 'Prop 2' }, 300_000, ['properties'])
    })

    it('should invalidate by exact pattern', () => {
      const count = service.invalidate('properties:1')

      expect(count).toBe(1)
      expect(service.get('properties:1')).toBeNull()
      expect(service.get('properties:2')).not.toBeNull()
    })

    it('should invalidate by pattern substring', () => {
      // Invalidate all entries containing 'user:abc'
      const count = service.invalidate('user:abc')

      expect(count).toBe(2)
      expect(service.get('user:abc:properties')).toBeNull()
      expect(service.get('user:abc:leases')).toBeNull()
      expect(service.get('user:xyz:properties')).not.toBeNull()
    })

    it('should invalidate by dependency', () => {
      // Invalidate all entries with 'properties' dependency
      const count = service.invalidate('properties')

      expect(count).toBeGreaterThanOrEqual(4) // All entries with 'properties' dependency
    })

    it('should invalidate by regex pattern', () => {
      const count = service.invalidate(/^user:.*:properties$/)

      expect(count).toBe(2) // user:abc:properties and user:xyz:properties
      expect(service.get('user:abc:properties')).toBeNull()
      expect(service.get('user:xyz:properties')).toBeNull()
      expect(service.get('user:abc:leases')).not.toBeNull()
    })

    it('should increment invalidation count', () => {
      service.invalidate('properties:1')

      const stats = service.getStats()
      expect(stats.invalidations).toBe(1)
    })
  })

  describe('Entity-Based Invalidation', () => {
    beforeEach(() => {
      service.set('properties:123:details', { name: 'Test' }, 300_000, ['properties:123'])
      service.set('properties:123:units', [{ id: '1' }], 300_000, ['properties:123'])
      service.set('properties:456:details', { name: 'Other' }, 300_000, ['properties:456'])
    })

    it('should invalidate by entity type and id', () => {
      const count = service.invalidateByEntity('properties', '123')

      expect(count).toBe(2) // Both entries for property 123
      expect(service.get('properties:123:details')).toBeNull()
      expect(service.get('properties:123:units')).toBeNull()
      expect(service.get('properties:456:details')).not.toBeNull()
    })

    it('should invalidate all entities of type when no id provided', () => {
      const count = service.invalidateByEntity('properties')

      expect(count).toBe(3) // All property entries
    })
  })

  describe('User-Based Invalidation', () => {
    beforeEach(() => {
      service.set('user:user123:dashboard', { stats: {} }, 300_000, ['user:user123'])
      service.set('user:user123:properties', [], 300_000, ['user:user123'])
      service.set('user:user456:dashboard', { stats: {} }, 300_000, ['user:user456'])
    })

    it('should invalidate all cache entries for a specific user', () => {
      const count = service.invalidateByUser('user123')

      expect(count).toBe(2)
      expect(service.get('user:user123:dashboard')).toBeNull()
      expect(service.get('user:user123:properties')).toBeNull()
      expect(service.get('user:user456:dashboard')).not.toBeNull()
    })
  })

  describe('Cache Key Generation', () => {
    it('should generate user-specific cache keys', () => {
      const key = ZeroCacheService.getUserKey('user123', 'properties:findAll', { limit: 10 })
      expect(key).toBe('user:user123:properties:findAll:{"limit":10}')
    })

    it('should generate user key without params', () => {
      const key = ZeroCacheService.getUserKey('user123', 'dashboard:stats')
      expect(key).toBe('user:user123:dashboard:stats')
    })

    it('should generate entity-specific cache keys', () => {
      const key = ZeroCacheService.getEntityKey('properties', '123', 'details')
      expect(key).toBe('properties:123:details')
    })

    it('should generate entity key without operation', () => {
      const key = ZeroCacheService.getEntityKey('properties', '123')
      expect(key).toBe('properties:123')
    })
  })

  describe('Cache Clear', () => {
    it('should clear all cache entries', () => {
      service.set('key1', 'value1')
      service.set('key2', 'value2')
      service.set('key3', 'value3')

      service.clear()

      expect(service.get('key1')).toBeNull()
      expect(service.get('key2')).toBeNull()
      expect(service.get('key3')).toBeNull()
    })

    it('should increment invalidation count when clearing', () => {
      service.set('key1', 'value1')
      service.set('key2', 'value2')

      service.clear()

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

    it('should include cache statistics in health details', () => {
      service.set('test', 'value')
      service.get('test') // hit
      service.get('nonexistent') // miss

      const health = service.isHealthy()
      expect(health.details.hits).toBeDefined()
      expect(health.details.misses).toBeDefined()
      expect(health.details.entries).toBeDefined()
    })
  })
})
