import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultiTenantPrismaService } from '../common/prisma/multi-tenant-prisma.service'
import { AuthServiceSupabase } from './auth.service.supabase'
import { 
  mockPrismaClient, 
  mockSupabaseClient, 
  mockConfigService, 
  mockLogger,
  createMockSupabaseUser 
} from '../test/setup'

// Mock PrismaClient constructor
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient)
}))

describe('Authentication Edge Cases and Security Scenarios', () => {
  let multiTenantService: MultiTenantPrismaService
  let authService: AuthServiceSupabase
  let mockFrom: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockFrom = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }

    mockSupabaseClient.from.mockReturnValue(mockFrom)
    
    multiTenantService = new MultiTenantPrismaService(mockPrismaClient as any)
    authService = new AuthServiceSupabase(mockSupabaseClient as any, mockConfigService as any)
    
    // Mock loggers
    ;(multiTenantService as any).logger = mockLogger
    ;(authService as any).logger = mockLogger
  })

  describe('Concurrent Access Scenarios', () => {
    it('should handle multiple simultaneous tenant client requests', async () => {
      const userId = 'user-123'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10))
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      // Simulate multiple concurrent requests for the same user
      const requests = Array.from({ length: 5 }, () => 
        multiTenantService.getTenantClient(userId)
      )

      const clients = await Promise.all(requests)

      // All should return the same client instance
      clients.forEach(client => {
        expect(client).toBe(mockPrismaClient)
      })

      // Should only create one client in the pool
      const tenantClients = (multiTenantService as any).tenantClients
      expect(tenantClients.size).toBe(1)
      expect(tenantClients.has(userId)).toBe(true)
    })

    it('should handle concurrent user synchronization requests', async () => {
      const mockSupabaseUser = createMockSupabaseUser()
      
      // Mock database responses for new user creation
      mockFrom.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: mockSupabaseUser, error: null })

      // Simulate multiple concurrent sync requests
      const syncRequests = Array.from({ length: 3 }, () => 
        authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)
      )

      const results = await Promise.all(syncRequests)

      // All should succeed and return the same normalized user
      results.forEach(result => {
        expect(result.id).toBe('user-123')
        expect(result.email).toBe('test@tenantflow.app')
      })

      // Should handle the concurrent requests gracefully
      expect(mockFrom.insert).toHaveBeenCalled()
    })

    it('should handle mixed admin and tenant operations', async () => {
      const userId = 'user-123'
      
      // Set up tenant client
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      // Get admin client (no RLS)
      const adminClient = multiTenantService.getAdminClient()
      
      // Get tenant client (with RLS)
      const tenantClient = await multiTenantService.getTenantClient(userId)

      // Admin client should be the base Prisma service
      expect(adminClient).toBe(mockPrismaClient)
      
      // Tenant client should also be mockPrismaClient but with RLS context
      expect(tenantClient).toBe(mockPrismaClient)
      
      // Verify RLS was set up for tenant client
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          'SET LOCAL request.jwt.claims = ',
          expect.stringContaining('"sub":"user-123"'),
          '::jsonb'
        ])
      )
    })
  })

  describe('Permission Boundary Tests', () => {
    it('should verify admin operations bypass RLS correctly', async () => {
      const adminClient = multiTenantService.getAdminClient()
      
      // Admin operations should not set RLS context
      expect(adminClient).toBe(mockPrismaClient)
      
      // Mock admin operation (e.g., billing, cross-tenant query)
      mockPrismaClient.user.findMany = vi.fn().mockResolvedValue([])
      
      await adminClient.user.findMany()
      
      // Should not have called $executeRaw for RLS setup
      expect(mockPrismaClient.$executeRaw).not.toHaveBeenCalled()
    })

    it('should verify tenant operations respect RLS', async () => {
      const userId = 'tenant-user-456'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      const tenantClient = await multiTenantService.getTenantClient(userId)
      
      // Tenant operations should have RLS context set
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          'SET LOCAL request.jwt.claims = ',
          expect.stringContaining('"sub":"tenant-user-456"'),
          '::jsonb'
        ])
      )
    })

    it('should handle context switching between different tenants', async () => {
      const userId1 = 'tenant-1'
      const userId2 = 'tenant-2'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      // Get clients for different tenants
      await multiTenantService.getTenantClient(userId1)
      await multiTenantService.getTenantClient(userId2)

      // Verify both contexts were set correctly
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          'SET LOCAL request.jwt.claims = ',
          expect.stringContaining('"sub":"tenant-1"'),
          '::jsonb'
        ])
      )
      
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([
          'SET LOCAL request.jwt.claims = ',
          expect.stringContaining('"sub":"tenant-2"'),
          '::jsonb'
        ])
      )
    })
  })

  describe('Database Connection Failure Recovery', () => {
    it('should handle intermittent connection failures', async () => {
      const userId = 'user-123'
      
      // First attempt fails
      mockPrismaClient.$transaction.mockRejectedValueOnce(
        new Error('Connection temporarily unavailable')
      )
      
      // Second attempt succeeds
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      // First call should fail
      await expect(multiTenantService.getTenantClient(userId)).rejects.toThrow(
        'Failed to initialize tenant database connection'
      )

      // Second call should succeed
      const client = await multiTenantService.getTenantClient(userId)
      expect(client).toBe(mockPrismaClient)
    })

    it('should handle graceful degradation during database issues', async () => {
      const mockSupabaseUser = createMockSupabaseUser()
      
      // Simulate database unavailable
      mockFrom.single.mockRejectedValue(new Error('Database unavailable'))

      await expect(
        authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)
      ).rejects.toThrow('Database unavailable')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in syncUserWithDatabaseViaSupabase',
        expect.objectContaining({
          error: 'Database unavailable',
          userId: 'user-123'
        })
      )
    })
  })

  describe('Resource Cleanup Under Load', () => {
    it('should handle cleanup when many connections are active', async () => {
      // Create maximum number of connections
      const maxConnections = 10
      const userIds = Array.from({ length: maxConnections }, (_, i) => `user-${i}`)
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      // Create all connections
      await Promise.all(userIds.map(userId => 
        multiTenantService.getTenantClient(userId)
      ))

      const tenantClients = (multiTenantService as any).tenantClients
      expect(tenantClients.size).toBe(maxConnections)

      // Mock successful disconnect
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)

      // Trigger cleanup
      await multiTenantService.onModuleDestroy()

      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(maxConnections)
      expect(tenantClients.size).toBe(0)
    })

    it('should handle partial cleanup failures gracefully', async () => {
      const userIds = ['user-1', 'user-2', 'user-3']
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      // Create connections
      await Promise.all(userIds.map(userId => 
        multiTenantService.getTenantClient(userId)
      ))

      // Mock mixed success/failure for disconnect
      mockPrismaClient.$disconnect
        .mockResolvedValueOnce(undefined) // Success
        .mockRejectedValueOnce(new Error('Disconnect failed')) // Failure
        .mockResolvedValueOnce(undefined) // Success

      await multiTenantService.onModuleDestroy()

      // Should log the failure but continue cleanup
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to disconnect tenant client'),
        expect.any(Error)
      )

      // Should still clear the map
      const tenantClients = (multiTenantService as any).tenantClients
      expect(tenantClients.size).toBe(0)
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle Unicode and special characters in user IDs', async () => {
      const specialUserId = 'user-🔐-test@domain.com'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      await multiTenantService.getTenantClient(specialUserId)

      // Verify the special characters are properly JSON-escaped
      const callArgs = mockPrismaClient.$executeRaw.mock.calls[0][0]
      const jsonString = callArgs[1]
      
      // Should be valid JSON
      expect(() => JSON.parse(jsonString)).not.toThrow()
      
      // Should contain the escaped Unicode characters
      expect(jsonString).toContain('user-🔐-test@domain.com')
    })

    it('should handle extremely long user IDs', async () => {
      const longUserId = 'user-' + 'a'.repeat(1000) + '-end'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      await multiTenantService.getTenantClient(longUserId)

      // Should handle long IDs without issues
      const callArgs = mockPrismaClient.$executeRaw.mock.calls[0][0]
      expect(callArgs[1]).toContain(longUserId)
    })

    it('should sanitize and validate email inputs in auth service', async () => {
      const mockSupabaseUser = createMockSupabaseUser({
        email: 'test+tag@domain.com'
      })
      
      mockFrom.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: mockSupabaseUser, error: null })

      const result = await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

      expect(result.email).toBe('test+tag@domain.com')
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test+tag@domain.com'
        })
      )
    })
  })

  describe('Memory Management Under Stress', () => {
    it('should handle rapid client creation and destruction', async () => {
      const cycles = 5
      const clientsPerCycle = 3
      
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)

      for (let cycle = 0; cycle < cycles; cycle++) {
        // Create clients
        const userIds = Array.from({ length: clientsPerCycle }, (_, i) => 
          `cycle-${cycle}-user-${i}`
        )
        
        await Promise.all(userIds.map(userId => 
          multiTenantService.getTenantClient(userId)
        ))

        // Disconnect all clients in this cycle
        await Promise.all(userIds.map(userId => 
          multiTenantService.disconnectTenantClient(userId)
        ))
      }

      const tenantClients = (multiTenantService as any).tenantClients
      expect(tenantClients.size).toBe(0)
      
      // Should have called disconnect for each client created
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(cycles * clientsPerCycle)
    })
  })
})