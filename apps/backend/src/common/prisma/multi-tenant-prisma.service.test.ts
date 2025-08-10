import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { MultiTenantPrismaService } from './multi-tenant-prisma.service'
import { mockPrismaClient, mockLogger } from '../../test/setup-jest'

// Mock PrismaClient constructor
jest.mock('@repo/database', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}))

// Mock security type guards
jest.mock('../security/type-guards', () => ({
  isValidUserId: jest.fn((userId: any) => {
    // Mock validation - return true for valid UUIDs, false for invalid ones
    if (typeof userId !== 'string') return false
    if (userId === '') return false
    if (userId === 'user-123; DROP TABLE users; --') return false
    if (userId === 'user@domain.com"\'\\}{[]') return false
    // Valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(userId)
  }),
  validateJWTClaims: jest.fn((claims: any) => {
    // Mock validation - return claims if valid sub field exists
    if (claims && typeof claims.sub === 'string') {
      return claims
    }
    return null
  })
}))

// Mock PrismaService
const mockPrismaService = mockPrismaClient

describe('MultiTenantPrismaService', () => {
  let service: MultiTenantPrismaService
  let intervalSpy: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Mock setInterval
    intervalSpy = jest.spyOn(global, 'setInterval')
    
    service = new MultiTenantPrismaService(mockPrismaService as any)
    
    // Mock the private logger
    ;(service as any).logger = mockLogger
  })

  afterEach(() => {
    jest.useRealTimers()
    intervalSpy.mockRestore()
  })

  describe('Constructor and initialization', () => {
    it('should initialize with admin Prisma client', () => {
      expect((service as any).adminPrisma).toBe(mockPrismaService)
      expect((service as any).tenantClients).toBeInstanceOf(Map)
      expect((service as any).tenantClients.size).toBe(0)
    })

    it('should set up cleanup interval', async () => {
      // setInterval is called in onModuleInit, not constructor
      await service.onModuleInit()
      
      expect(intervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        300000 // 5 minutes
      )
    })
  })

  describe('getAdminClient', () => {
    it('should return admin Prisma client', () => {
      const adminClient = service.getAdminClient()
      expect(adminClient).toBe(mockPrismaService)
    })
  })

  describe('getTenantClient', () => {
    it('should create new tenant client for first-time user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Mock $transaction for RLS setup
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      mockPrismaClient.$executeRaw.mockResolvedValue(1 as any)

      const client = await service.getTenantClient(userId)

      expect(client).toEqual(mockPrismaClient)
      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        ['SET LOCAL request.jwt.claims = ', '::jsonb'],
        '{"sub":"123e4567-e89b-12d3-a456-426614174000"}'
      )
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Created new tenant client for user ${userId}`
      )
    })

    it('should reuse existing tenant client', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // First call - create client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      const client1 = await service.getTenantClient(userId)
      
      // Clear mocks for second call
      jest.clearAllMocks()
      
      // Second call - should reuse
      const client2 = await service.getTenantClient(userId)

      expect(client2).toBe(client1)
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Reusing existing tenant client for user ${userId}`
      )
    })

    it('should throw error for invalid userId', async () => {
      await expect(service.getTenantClient('')).rejects.toThrow(
        'Invalid userId provided - security validation failed'
      )
      
      await expect(service.getTenantClient(null as any)).rejects.toThrow(
        'Invalid userId provided - security validation failed'
      )
      
      await expect(service.getTenantClient(123 as any)).rejects.toThrow(
        'Invalid userId provided - security validation failed'
      )
    })

    it('should handle pool size limit by evicting oldest client', async () => {
      const maxPoolSize = 10
      
      // Fill the pool to max capacity
      for (let i = 0; i < maxPoolSize; i++) {
        mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
          return callback(mockPrismaClient)
        })
        await service.getTenantClient(`123e4567-e89b-12d3-a456-42661417400${i}`)
      }

      // Mock disconnect for eviction
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)

      // Add one more client - should evict the oldest
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      await service.getTenantClient('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Evicted oldest tenant client')
      )
    })

    it('should handle client creation errors', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Connection failed'))

      await expect(service.getTenantClient(userId)).rejects.toThrow(
        'Failed to initialize tenant database connection: Connection failed'
      )
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to create tenant client for user ${userId}:`,
        expect.any(Error)
      )
    })
  })

  describe('withTenantContext', () => {
    it('should execute callback with tenant context successfully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockCallback = jest.fn().mockResolvedValue('result')
      
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      // Mock getTenantClient
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      const result = await service.withTenantContext(userId, mockCallback)

      expect(result).toBe('result')
      expect(mockCallback).toHaveBeenCalledWith(mockPrismaClient)
    })

    it('should validate userId parameter', async () => {
      const mockCallback = jest.fn()

      await expect(service.withTenantContext('', mockCallback)).rejects.toThrow(
        'Invalid userId provided - security validation failed'
      )
      
      await expect(service.withTenantContext(null as any, mockCallback)).rejects.toThrow(
        'Invalid userId provided - security validation failed'
      )
    })

    it('should validate callback parameter', async () => {
      await expect(service.withTenantContext('123e4567-e89b-12d3-a456-426614174000', null as any)).rejects.toThrow(
        'Callback must be a function'
      )
      
      await expect(service.withTenantContext('123e4567-e89b-12d3-a456-426614174000', 'not-a-function' as any)).rejects.toThrow(
        'Callback must be a function'
      )
    })

    it('should handle callback errors with proper logging', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockError = new Error('Callback failed')
      const mockCallback = jest.fn().mockRejectedValue(mockError)
      
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      await expect(service.withTenantContext(userId, mockCallback)).rejects.toThrow(
        'Tenant operation failed: Callback failed'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error in withTenantContext for user ${userId}:`,
        expect.objectContaining({
          error: 'Callback failed',
          stack: expect.any(String),
          userId
        })
      )
    })

    it('should handle non-Error objects thrown by callback', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockCallback = jest.fn().mockRejectedValue('String error')
      
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      await expect(service.withTenantContext(userId, mockCallback)).rejects.toThrow(
        'Tenant operation failed with unknown error'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error in withTenantContext for user ${userId}:`,
        expect.objectContaining({
          error: 'Unknown error',
          userId
        })
      )
    })

    it('should use transaction with proper configuration', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const mockCallback = jest.fn().mockResolvedValue('result')
      
      let transactionConfig: any
      mockPrismaClient.$transaction.mockImplementation(async (callback, config) => {
        transactionConfig = config
        return callback(mockPrismaClient)
      })
      
      mockPrismaClient.$executeRaw.mockResolvedValue(1)

      await service.withTenantContext(userId, mockCallback)

      expect(transactionConfig).toEqual({
        timeout: 30000,
        isolationLevel: 'ReadCommitted'
      })
    })
  })

  describe('disconnectTenantClient', () => {
    it('should disconnect existing tenant client', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // First create a client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      // Mock disconnect
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      
      await service.disconnectTenantClient(userId)

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Manually disconnected tenant client for user ${userId}`
      )
    })

    it('should handle disconnect errors gracefully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Create a client first
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      // Mock disconnect error
      mockPrismaClient.$disconnect.mockRejectedValue(new Error('Disconnect failed'))
      
      await service.disconnectTenantClient(userId)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to disconnect tenant client for user ${userId}:`,
        expect.any(Error)
      )
    })

    it('should handle non-existent client gracefully', async () => {
      await service.disconnectTenantClient('non-existent-user')
      
      expect(mockPrismaClient.$disconnect).not.toHaveBeenCalled()
      expect(mockLogger.debug).not.toHaveBeenCalled()
    })
  })

  describe('getPoolStats', () => {
    it('should return accurate pool statistics', async () => {
      const userId1 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const userId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      
      // Create some clients
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId1)
      await service.getTenantClient(userId2)

      const stats = service.getPoolStats()

      expect(stats).toEqual({
        activeConnections: 2,
        maxPoolSize: 10,
        clientTTL: 300000,
        clients: expect.arrayContaining([
          expect.objectContaining({
            userId: 'f47ac10b...',
            lastUsed: expect.any(String),
            ageMinutes: expect.any(Number)
          }),
          expect.objectContaining({
            userId: '6ba7b810...',
            lastUsed: expect.any(String),
            ageMinutes: expect.any(Number)
          })
        ])
      })
    })

    it('should return empty stats when no clients exist', () => {
      const stats = service.getPoolStats()

      expect(stats).toEqual({
        activeConnections: 0,
        maxPoolSize: 10,
        clientTTL: 300000,
        clients: []
      })
    })

    it('should mask user IDs for privacy', async () => {
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)

      const stats = service.getPoolStats()

      expect(stats.clients[0].userId).toBe('f47ac10b...')
    })
  })

  describe('cleanupUnusedClients', () => {
    it('should clean up clients older than TTL', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Create a client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      // Mock disconnect
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      
      // Fast-forward time beyond TTL
      jest.advanceTimersByTime(300001) // Just over 5 minutes
      
      // Trigger cleanup (this would normally happen via interval)
      const cleanupMethod = (service as any).cleanupUnusedClients
      await cleanupMethod.call(service)

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Cleaned up unused tenant client for user ${userId}`
      )
    })

    it('should not clean up recently used clients', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Create a client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      // Fast-forward time but not beyond TTL
      jest.advanceTimersByTime(100000) // 1.67 minutes
      
      // Trigger cleanup
      const cleanupMethod = (service as any).cleanupUnusedClients
      cleanupMethod.call(service)

      expect(mockPrismaClient.$disconnect).not.toHaveBeenCalled()
    })

    it('should handle disconnect errors during cleanup', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Create a client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      // Mock disconnect error
      mockPrismaClient.$disconnect.mockRejectedValue(new Error('Disconnect failed'))
      
      // Fast-forward time beyond TTL
      jest.advanceTimersByTime(300001)
      
      // Trigger cleanup
      const cleanupMethod = (service as any).cleanupUnusedClients
      await cleanupMethod.call(service)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to disconnect unused client for user ${userId}:`,
        expect.any(Error)
      )
    })
  })

  describe('onModuleDestroy', () => {
    it('should disconnect all tenant clients on module destroy', async () => {
      const userId1 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const userId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      
      // Create some clients
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId1)
      await service.getTenantClient(userId2)
      
      // Mock disconnect
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      
      await service.onModuleDestroy()

      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(2)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Disconnected tenant client for user ${userId1}`
      )
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Disconnected tenant client for user ${userId2}`
      )
    })

    it('should handle disconnect errors during module destroy', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Create a client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      // Mock disconnect error
      mockPrismaClient.$disconnect.mockRejectedValue(new Error('Disconnect failed'))
      
      await service.onModuleDestroy()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to disconnect tenant client for user ${userId}:`,
        expect.any(Error)
      )
    })

    it('should clear tenant clients map after destroy', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Create a client
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      await service.getTenantClient(userId)
      
      expect((service as any).tenantClients.size).toBe(1)
      
      mockPrismaClient.$disconnect.mockResolvedValue(undefined)
      await service.onModuleDestroy()

      expect((service as any).tenantClients.size).toBe(0)
    })
  })

  describe('SQL injection prevention', () => {
    it('should reject malicious user IDs with SQL injection attempts', async () => {
      const maliciousUserId = 'user-123; DROP TABLE users; --'
      
      // The enhanced validation should reject this malicious input
      await expect(service.getTenantClient(maliciousUserId))
        .rejects.toThrow('Invalid userId provided - security validation failed')

      // Verify that no database operations were attempted
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled()
      expect(mockPrismaClient.$executeRaw).not.toHaveBeenCalled()
    })

    it('should reject special characters in userId for security', async () => {
      const specialUserId = 'user@domain.com"\'\\}{[]'
      
      // The enhanced validation should reject this malicious input
      await expect(service.getTenantClient(specialUserId))
        .rejects.toThrow('Invalid userId provided - security validation failed')

      // Verify that no database operations were attempted
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled()
      expect(mockPrismaClient.$executeRaw).not.toHaveBeenCalled()
    })
  })

  describe('Connection lifecycle management', () => {
    it('should update lastUsed timestamp when reusing client', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      // Create client
      await service.getTenantClient(userId)
      
      const tenantClients = (service as any).tenantClients
      const initialTime = tenantClients.get(userId).lastUsed
      
      // Fast-forward time
      jest.advanceTimersByTime(10000)
      
      // Use client again
      await service.getTenantClient(userId)
      
      const updatedTime = tenantClients.get(userId).lastUsed
      expect(updatedTime.getTime()).toBeGreaterThan(initialTime.getTime())
    })

    it('should maintain separate connections for different users', async () => {
      const userId1 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const userId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      mockPrismaClient.$executeRaw.mockResolvedValue(1)
      
      const client1 = await service.getTenantClient(userId1)
      const client2 = await service.getTenantClient(userId2)
      
      // Both should be the same mock instance but tracked separately
      expect(client1).toBe(mockPrismaClient)
      expect(client2).toBe(mockPrismaClient)
      
      const tenantClients = (service as any).tenantClients
      expect(tenantClients.size).toBe(2)
      expect(tenantClients.has(userId1)).toBe(true)
      expect(tenantClients.has(userId2)).toBe(true)
    })
  })

  describe('Error recovery scenarios', () => {
    it('should handle database connection failures gracefully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Connection refused'))

      await expect(service.getTenantClient(userId)).rejects.toThrow(
        'Failed to initialize tenant database connection: Connection refused'
      )
      
      // Client should not be stored in pool if creation failed
      const tenantClients = (service as any).tenantClients
      expect(tenantClients.has(userId)).toBe(false)
    })

    it('should handle RLS setup failures', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      
      mockPrismaClient.$executeRaw.mockRejectedValue(new Error('RLS setup failed'))
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })

      await expect(service.getTenantClient(userId)).rejects.toThrow(
        'Failed to initialize tenant database connection: RLS setup failed'
      )
    })

    it('should recover from partial failures in pool management', async () => {
      // Fill pool to capacity
      for (let i = 0; i < 10; i++) {
        mockPrismaClient.$transaction.mockImplementation(async (callback) => {
          return callback(mockPrismaClient)
        })
        mockPrismaClient.$executeRaw.mockResolvedValue(1)
        await service.getTenantClient(`123e4567-e89b-12d3-a456-42661417400${i}`)
      }

      // Mock disconnect failure for eviction
      mockPrismaClient.$disconnect.mockRejectedValueOnce(new Error('Disconnect failed'))
      
      // Should still create new client despite eviction failure
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaClient)
      })
      
      const newClient = await service.getTenantClient('f47ac10b-58cc-4372-a567-0e02b2c3d479')
      expect(newClient).toBe(mockPrismaClient)
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to disconnect client'),
        expect.any(Error)
      )
    })
  })
})