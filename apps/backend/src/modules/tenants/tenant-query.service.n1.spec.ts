import { Test } from '@nestjs/testing'
import { Logger } from '@nestjs/common'
import { TenantRelationService } from './tenant-relation.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'



/**
 * N+1 Query Prevention Tests
 *
 * These tests verify that TenantRelationService uses optimized queries
 * instead of sequential queries when fetching tenant relationships.
 *
 * The service queries leases directly (since leases have property_owner_id)
 * instead of using nested joins through properties -> units -> leases.
 */
describe('TenantRelationService - N+1 Query Prevention', () => {
  let service: TenantRelationService
  let mockSupabaseService: jest.Mocked<SupabaseService>
  let queryCount: number

  beforeEach(async () => {
    queryCount = 0

    // Create mock client that tracks query count
    const createMockClient = () => {
      const mockClient = {
        from: jest.fn().mockImplementation(() => {
          queryCount++ // Count each .from() call as a query
          return mockClient
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: jest.fn((cb) => {
          cb({ data: [], error: null })
          return Promise.resolve({ data: [], error: null })
        })
      }
      return mockClient
    }

    mockSupabaseService = {
      getAdminClient: jest.fn().mockReturnValue(createMockClient())
    } as unknown as jest.Mocked<SupabaseService>

    const module = await Test.createTestingModule({
      providers: [
        TenantRelationService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
          }
        },
        {
          provide: AppLogger,
          useValue: new SilentLogger()
        }
      ]
    }).compile()

    service = module.get<TenantRelationService>(TenantRelationService)
      // Override logger to suppress output
      ; (service as any).logger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      } as unknown as Logger
  })

  describe('getTenantIdsForOwner - N+1 Prevention', () => {
    it('should use only 2 queries: owner lookup + direct leases query', async () => {
      // Setup: Mock owner record and direct leases query
      const mockOwnerRecord = { id: 'owner-1' }
      const mockLeases = [
        { primary_tenant_id: 'tenant-1' },
        { primary_tenant_id: 'tenant-1' }, // Duplicate
        { primary_tenant_id: 'tenant-2' }
      ]

      const mockClient = mockSupabaseService.getAdminClient()

      let callIndex = 0
      mockClient.select = jest.fn().mockImplementation(() => {
        callIndex++

        // First call: get owner record
        if (callIndex === 1) {
          mockClient.maybeSingle = jest.fn().mockResolvedValue({
            data: mockOwnerRecord,
            error: null
          })
        }
        // Second call: direct leases query
        else if (callIndex === 2) {
          mockClient.not = jest.fn().mockResolvedValue({
            data: mockLeases,
            error: null
          })
        }

        return mockClient
      })

      // Reset query counter
      queryCount = 0

      // Execute
      const result = await service.getTenantIdsForOwner('auth-user-123')

      // Assert: Should use exactly 2 queries (not 4 with nested joins)
      // 1 query: Get owner record from property_owners
      // 1 query: Get leases directly by property_owner_id
      // TOTAL: 2 queries (optimized from previous 4: properties + units + leases joins)
      expect(queryCount).toBeLessThanOrEqual(2)
      expect(result).toEqual(['tenant-1', 'tenant-2'])
    })

    it('should query leases table directly instead of nested joins', async () => {
      const mockOwnerRecord = { id: 'owner-1' }
      const mockClient = mockSupabaseService.getAdminClient()

      let callIndex = 0
      mockClient.select = jest.fn().mockImplementation(() => {
        callIndex++

        if (callIndex === 1) {
          mockClient.maybeSingle = jest.fn().mockResolvedValue({
            data: mockOwnerRecord,
            error: null
          })
        } else if (callIndex === 2) {
          mockClient.not = jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }

        return mockClient
      })

      queryCount = 0

      await service.getTenantIdsForOwner('auth-user-123')

      // Verify the from() calls - should query leases directly
      const fromCalls = mockClient.from.mock.calls
      expect(fromCalls).toHaveLength(2)
      expect(fromCalls[0][0]).toBe('property_owners')
      expect(fromCalls[1][0]).toBe('leases')
    })

    it('should handle empty results at any step', async () => {
      const mockClient = mockSupabaseService.getAdminClient()

      mockClient.select = jest.fn().mockImplementation(() => {
        mockClient.maybeSingle = jest.fn().mockResolvedValue({
          data: null, // No owner found
          error: null
        })
        return mockClient
      })

      const result = await service.getTenantIdsForOwner('auth-user-123')

      expect(result).toEqual([])
    })
  })
})
