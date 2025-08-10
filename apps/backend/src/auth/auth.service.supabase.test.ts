import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { AuthServiceSupabase } from './auth.service.supabase'
import { 
  mockSupabaseClient, 
  mockConfigService, 
  mockLogger, 
  createMockSupabaseUser, 
  createMockDatabaseUser 
} from '../test/setup'

describe('AuthServiceSupabase', () => {
  let authService: AuthServiceSupabase
  let mockFrom: any

  beforeEach(() => {
    mockFrom = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }

    mockSupabaseClient.from.mockReturnValue(mockFrom)
    
    authService = new AuthServiceSupabase(mockSupabaseClient as any, mockConfigService as any)
    
    // Mock the private logger
    ;(authService as any).logger = mockLogger
  })

  describe('syncUserWithDatabaseViaSupabase', () => {
    describe('New user creation', () => {
      it('should create a new user when user does not exist', async () => {
        const mockSupabaseUser = createMockSupabaseUser()
        const mockDatabaseUser = createMockDatabaseUser()

        // Mock user not found (PGRST116 is "Row not found" error)
        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' }
        })

        // Mock successful user creation
        mockFrom.single.mockResolvedValueOnce({
          data: mockDatabaseUser,
          error: null
        })

        const result = await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('User')
        expect(mockFrom.select).toHaveBeenCalledWith('*')
        expect(mockFrom.eq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000')
        
        expect(mockFrom.insert).toHaveBeenCalledWith({
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@tenantflow.app',
          name: 'Test User',
          avatarUrl: 'https://tenantflow.app/avatar.jpg',
          role: 'OWNER',
          supabaseId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        })

        expect(result).toEqual({
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@tenantflow.app',
          name: 'Test User',
          avatarUrl: 'https://tenantflow.app/avatar.jpg',
          role: 'OWNER',
          phone: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          emailVerified: true,
          bio: null,
          supabaseId: '123e4567-e89b-12d3-a456-426614174000',
          stripeCustomerId: null,
          organizationId: null
        })
      })

      it('should handle user creation with minimal metadata', async () => {
        const mockSupabaseUser = createMockSupabaseUser({
          user_metadata: {} // No metadata
        })
        
        const mockDatabaseUser = createMockDatabaseUser({
          name: '',
          avatarUrl: null
        })

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        mockFrom.single.mockResolvedValueOnce({
          data: mockDatabaseUser,
          error: null
        })

        const result = await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

        expect(mockFrom.insert).toHaveBeenCalledWith(expect.objectContaining({
          name: '',
          avatarUrl: null
        }))

        expect(result.name).toBe(undefined) // Should be undefined when empty string
        expect(result.avatarUrl).toBe(undefined) // Should be undefined when null
      })

      it('should handle user creation errors', async () => {
        const mockSupabaseUser = createMockSupabaseUser()

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database connection failed' }
        })

        await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
          .rejects.toThrow('Failed to sync user: Database connection failed')

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to insert user via Supabase',
          expect.objectContaining({
            error: { message: 'Database connection failed' },
            userId: '123e4567-e89b-12d3-a456-426614174000'
          })
        )
      })
    })

    describe('Existing user updates', () => {
      it('should update existing user successfully', async () => {
        const mockSupabaseUser = createMockSupabaseUser({
          user_metadata: {
            name: 'Updated User',
            avatar_url: 'https://tenantflow.app/new-avatar.jpg'
          }
        })
        
        const existingUser = createMockDatabaseUser()
        const updatedUser = createMockDatabaseUser({
          name: 'Updated User',
          avatarUrl: 'https://tenantflow.app/new-avatar.jpg'
        })

        // Mock existing user found
        mockFrom.single.mockResolvedValueOnce({
          data: existingUser,
          error: null
        })

        // Mock successful update
        mockFrom.single.mockResolvedValueOnce({
          data: updatedUser,
          error: null
        })

        const result = await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

        expect(mockFrom.update).toHaveBeenCalledWith({
          email: 'test@tenantflow.app',
          name: 'Updated User',
          avatarUrl: 'https://tenantflow.app/new-avatar.jpg',
          updatedAt: expect.any(String)
        })

        expect(result.name).toBe('Updated User')
        expect(result.avatarUrl).toBe('https://tenantflow.app/new-avatar.jpg')
      })

      it('should handle user update errors', async () => {
        const mockSupabaseUser = createMockSupabaseUser()
        const existingUser = createMockDatabaseUser()

        mockFrom.single.mockResolvedValueOnce({
          data: existingUser,
          error: null
        })

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' }
        })

        await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
          .rejects.toThrow('Failed to update user: Update failed')

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to update user via Supabase',
          expect.objectContaining({
            error: { message: 'Update failed' },
            userId: '123e4567-e89b-12d3-a456-426614174000'
          })
        )
      })
    })

    describe('Input validation', () => {
      it('should throw error when supabaseUser is undefined', async () => {
        await expect(authService.syncUserWithDatabaseViaSupabase(undefined as any))
          .rejects.toThrow('Supabase user is required')

        expect(mockLogger.error).toHaveBeenCalledWith(
          'syncUserWithDatabase called with undefined supabaseUser'
        )
      })

      it('should throw UnauthorizedException when email is missing', async () => {
        const mockSupabaseUser = createMockSupabaseUser({ email: null })

        await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
          .rejects.toThrow(UnauthorizedException)
        
        await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
          .rejects.toThrow('User email is required')
      })

      it('should throw UnauthorizedException when email is empty string', async () => {
        const mockSupabaseUser = createMockSupabaseUser({ email: '' })

        await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
          .rejects.toThrow(UnauthorizedException)
      })
    })

    describe('Edge cases', () => {
      it('should handle user with full_name instead of name in metadata', async () => {
        const mockSupabaseUser = createMockSupabaseUser({
          user_metadata: {
            full_name: 'Full Name User',
            // No 'name' field
            avatar_url: 'https://tenantflow.app/avatar.jpg'
          }
        })

        const mockDatabaseUser = createMockDatabaseUser({
          name: 'Full Name User'
        })

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        mockFrom.single.mockResolvedValueOnce({
          data: mockDatabaseUser,
          error: null
        })

        const result = await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

        expect(mockFrom.insert).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Full Name User'
        }))

        expect(result.name).toBe('Full Name User')
      })

      it('should use empty string for name when no metadata name fields exist', async () => {
        const mockSupabaseUser = createMockSupabaseUser({
          user_metadata: {
            // No name or full_name
            avatar_url: 'https://tenantflow.app/avatar.jpg'
          }
        })

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        mockFrom.single.mockResolvedValueOnce({
          data: createMockDatabaseUser({ name: '' }),
          error: null
        })

        await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

        expect(mockFrom.insert).toHaveBeenCalledWith(expect.objectContaining({
          name: ''
        }))
      })

      it('should handle missing created_at and updated_at timestamps', async () => {
        const mockSupabaseUser = createMockSupabaseUser({
          created_at: undefined,
          updated_at: undefined
        })

        mockFrom.single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

        mockFrom.single.mockResolvedValueOnce({
          data: createMockDatabaseUser(),
          error: null
        })

        await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

        expect(mockFrom.insert).toHaveBeenCalledWith(expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }))
      })
    })
  })

  describe('normalizeSupabaseUser (private method)', () => {
    it('should normalize database row with all fields', () => {
      const authServiceAny = authService as any
      const mockRow = createMockDatabaseUser({
        bio: 'Test bio',
        emailVerified: false,
        phone: '+1234567890'
      })

      const result = authServiceAny.normalizeSupabaseUser(mockRow)

      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@tenantflow.app',
        name: 'Test User',
        avatarUrl: 'https://tenantflow.app/avatar.jpg',
        role: 'OWNER',
        phone: '+1234567890',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        emailVerified: false,
        bio: 'Test bio',
        supabaseId: '123e4567-e89b-12d3-a456-426614174000',
        stripeCustomerId: null,
        organizationId: null
      })
    })

    it('should handle null/undefined optional fields', () => {
      const authServiceAny = authService as any
      const mockRow = createMockDatabaseUser({
        name: null,
        avatarUrl: null,
        phone: null,
        bio: null,
        emailVerified: undefined
      })

      const result = authServiceAny.normalizeSupabaseUser(mockRow)

      expect(result.name).toBe(undefined)
      expect(result.avatarUrl).toBe(undefined)
      expect(result.phone).toBe(null)
      expect(result.bio).toBe(null)
      expect(result.emailVerified).toBe(true) // Default value
    })

    it('should handle Date objects for timestamps', () => {
      const authServiceAny = authService as any
      const createdDate = new Date('2024-01-01T12:00:00Z')
      const updatedDate = new Date('2024-01-02T12:00:00Z')
      
      const mockRow = createMockDatabaseUser({
        createdAt: createdDate,
        updatedAt: updatedDate
      })

      const result = authServiceAny.normalizeSupabaseUser(mockRow)

      expect(result.createdAt).toBe('2024-01-01T12:00:00.000Z')
      expect(result.updatedAt).toBe('2024-01-02T12:00:00.000Z')
    })

    it('should fallback to id when supabaseId is missing', () => {
      const authServiceAny = authService as any
      const mockRow = createMockDatabaseUser({
        supabaseId: undefined
      })

      const result = authServiceAny.normalizeSupabaseUser(mockRow)

      expect(result.supabaseId).toBe('123e4567-e89b-12d3-a456-426614174000') // Falls back to id
    })
  })

  describe('Error handling and logging', () => {
    it('should log debug information on successful sync', async () => {
      const mockSupabaseUser = createMockSupabaseUser()
      const mockDatabaseUser = createMockDatabaseUser()

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      mockFrom.single.mockResolvedValueOnce({
        data: mockDatabaseUser,
        error: null
      })

      await authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser)

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'syncUserWithDatabase called',
        {
          hasUser: true,
          userId: '123e4567-e89b-12d3-a456-426614174000',
          userEmail: 'test@tenantflow.app'
        }
      )
    })

    it('should handle and log unexpected errors', async () => {
      const mockSupabaseUser = createMockSupabaseUser()

      mockFrom.single.mockRejectedValueOnce(new Error('Unexpected database error'))

      await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
        .rejects.toThrow('Unexpected database error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in syncUserWithDatabaseViaSupabase',
        {
          error: 'Unexpected database error',
          userId: '123e4567-e89b-12d3-a456-426614174000'
        }
      )
    })

    it('should handle non-Error objects thrown', async () => {
      const mockSupabaseUser = createMockSupabaseUser()

      mockFrom.single.mockRejectedValueOnce('String error')

      await expect(authService.syncUserWithDatabaseViaSupabase(mockSupabaseUser))
        .rejects.toThrow('String error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in syncUserWithDatabaseViaSupabase',
        {
          error: 'Unknown error',
          userId: '123e4567-e89b-12d3-a456-426614174000'
        }
      )
    })
  })
})