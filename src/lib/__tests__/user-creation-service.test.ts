import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserCreationService } from '../user-creation-service'
import { supabase } from '@/lib/supabase'

// Type definitions for test mocks
interface MockSupabaseQueryBuilder {
  select: () => MockSupabaseQueryBuilder
  eq: () => MockSupabaseQueryBuilder
  single: () => Promise<{ data: unknown; error: unknown }>
  insert: () => MockSupabaseQueryBuilder
  upsert: () => MockSupabaseQueryBuilder
}


// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('UserCreationService', () => {
  let userCreationService: UserCreationService

  beforeEach(() => {
    userCreationService = UserCreationService.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ensureUserExists', () => {
    it('should return success when user already exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      } as MockSupabaseQueryBuilder)

      const result = await userCreationService.ensureUserExists('user-123', {
        role: 'OWNER',
        name: 'Test User',
      })

      expect(result.success).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.action).toBe('found_existing')
    })

    it('should create user when not found', async () => {
      const userId = 'user-123'
      const options = {
        role: 'OWNER' as const,
        name: 'Test User',
      }

      const mockFrom = vi.mocked(supabase.from)
      
      // Mock user not found
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        } as MockSupabaseQueryBuilder)
        // Mock successful stored procedure call
        .mockReturnValueOnce({} as MockSupabaseQueryBuilder)

      const mockRpc = vi.mocked(supabase.rpc)
      mockRpc.mockResolvedValue({
        data: { user_id: userId },
        error: null,
      })

      // Mock verification - user now exists
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            email: 'test@example.com',
            name: 'Test User',
            role: 'OWNER',
          },
          error: null,
        }),
      } as MockSupabaseQueryBuilder)

      const result = await userCreationService.ensureUserExists(userId, options)

      expect(mockRpc).toHaveBeenCalledWith('create_user_profile', {
        user_id: userId,
        user_role: 'OWNER',
        user_name: 'Test User',
      })

      expect(result.success).toBe(true)
      expect(result.userId).toBe(userId)
      expect(result.action).toBe('created_via_stored_procedure')
    })

    it('should retry on failure and eventually succeed', async () => {
      const userId = 'user-123'
      const options = {
        role: 'OWNER' as const,
        name: 'Test User',
        maxRetries: 2,
        retryDelayMs: 10, // Fast retry for testing
      }

      const mockFrom = vi.mocked(supabase.from)
      
      // First attempt - user not found
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        } as MockSupabaseQueryBuilder)

      const mockRpc = vi.mocked(supabase.rpc)
      
      // First RPC call fails
      mockRpc
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection timeout', code: '08006' },
        })

      // Second check - still not found
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        } as MockSupabaseQueryBuilder)

      // Second RPC call succeeds
      mockRpc
        .mockResolvedValueOnce({
          data: { user_id: userId },
          error: null,
        })

      // Final verification - user now exists
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            email: 'test@example.com',
            name: 'Test User',
            role: 'OWNER',
          },
          error: null,
        }),
      } as MockSupabaseQueryBuilder)

      const result = await userCreationService.ensureUserExists(userId, options)

      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
      expect(result.userId).toBe(userId)
    })

    it('should fail after max retries exceeded', async () => {
      const userId = 'user-123'
      const options = {
        role: 'OWNER' as const,
        name: 'Test User',
        maxRetries: 1,
        retryDelayMs: 10,
      }

      const mockFrom = vi.mocked(supabase.from)
      const mockRpc = vi.mocked(supabase.rpc)
      
      // User not found
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      } as MockSupabaseQueryBuilder)

      // All RPC calls fail
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: '08006' },
      })

      const result = await userCreationService.ensureUserExists(userId, options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Max retries exceeded')
      expect(mockRpc).toHaveBeenCalledTimes(1) // maxRetries = 1
    })

    it('should handle database connection errors gracefully', async () => {
      const userId = 'user-123'
      const options = {
        role: 'OWNER' as const,
        name: 'Test User',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      } as MockSupabaseQueryBuilder)

      const result = await userCreationService.ensureUserExists(userId, options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })

    it('should use default values when options not provided', async () => {
      const userId = 'user-123'

      const mockFrom = vi.mocked(supabase.from)
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        } as MockSupabaseQueryBuilder)

      const mockRpc = vi.mocked(supabase.rpc)
      mockRpc.mockResolvedValue({
        data: { user_id: userId },
        error: null,
      })

      // Mock verification
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: userId,
            name: 'User',
            role: 'OWNER',
          },
          error: null,
        }),
      } as MockSupabaseQueryBuilder)

      const result = await userCreationService.ensureUserExists(userId)

      expect(mockRpc).toHaveBeenCalledWith('create_user_profile', {
        user_id: userId,
        user_role: 'OWNER', // default
        user_name: 'User', // default
      })

      expect(result.success).toBe(true)
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UserCreationService.getInstance()
      const instance2 = UserCreationService.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })
})