import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { EmailService } from '../email/email.service'
import { SecurityUtils } from '../common/security/security.utils'
import {
  mockConfigService,
  mockPrismaService,
  mockErrorHandler,
  mockEmailService,
  mockSecurityUtils,
  mockSupabaseClient
} from '../test/setup'

// Mock createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

describe('AuthService', () => {
  let authService: AuthService
  let configService: ConfigService
  let prismaService: PrismaService
  let errorHandler: ErrorHandlerService
  let emailService: EmailService
  let securityUtils: SecurityUtils

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup config service defaults
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test',
        'NODE_ENV': 'test'
      }
      return config[key]
    })

    configService = mockConfigService
    prismaService = mockPrismaService
    errorHandler = mockErrorHandler
    emailService = mockEmailService
    securityUtils = mockSecurityUtils

    authService = new AuthService(
      configService,
      prismaService,
      errorHandler,
      emailService,
      securityUtils
    )
  })

  describe('constructor', () => {
    it('should initialize with valid Supabase configuration', () => {
      expect(authService).toBeDefined()
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_URL')
      expect(mockConfigService.get).toHaveBeenCalledWith('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('should throw error when Supabase configuration is missing', () => {
      mockConfigService.get.mockReturnValue(undefined)
      mockErrorHandler.createConfigError.mockReturnValue(new Error('Missing config'))

      expect(() => new AuthService(
        configService,
        prismaService,
        errorHandler,
        emailService,
        securityUtils
      )).toThrow()

      expect(mockErrorHandler.createConfigError).toHaveBeenCalledWith(
        'Missing required Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    })
  })

  describe('validateSupabaseToken', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const mockDbUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'OWNER',
      phone: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      bio: null,
      supabaseId: 'test-user-id',
      stripeCustomerId: null
    }

    it('should validate token and return user data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockPrismaService.user.upsert.mockResolvedValue(mockDbUser)
      mockPrismaService.subscription.findFirst.mockResolvedValue(null)

      const result = await authService.validateSupabaseToken('valid-token')

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith('valid-token')
      expect(result).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'OWNER',
        phone: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        emailVerified: true,
        bio: null,
        supabaseId: 'test-user-id',
        stripeCustomerId: null
      })
    })

    // All authentication must go through Supabase validation

    it('should throw UnauthorizedException for invalid token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      await expect(authService.validateSupabaseToken('invalid-token'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, email_confirmed_at: null }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: unverifiedUser },
        error: null
      })

      await expect(authService.validateSupabaseToken('valid-token'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should handle Supabase errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Service unavailable', status: 503 }
      })

      await expect(authService.validateSupabaseToken('valid-token'))
        .rejects.toThrow(UnauthorizedException)
    })
  })

  describe('syncUserWithDatabase', () => {
    const mockSupabaseUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    const mockDbUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'OWNER',
      phone: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      bio: null,
      supabaseId: 'test-user-id',
      stripeCustomerId: null
    }

    it('should sync user data successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null) // New user
      mockPrismaService.user.upsert.mockResolvedValue(mockDbUser)
      mockPrismaService.subscription.findFirst.mockResolvedValue(null)
      mockEmailService.sendWelcomeEmail.mockResolvedValue({ success: true, messageId: 'msg-123' })

      const result = await authService.syncUserWithDatabase(mockSupabaseUser)

      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        update: {
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          updatedAt: expect.any(Date)
        },
        create: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          role: 'OWNER',
          supabaseId: 'test-user-id',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      })

      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User'
      )

      expect(result.id).toBe('test-user-id')
    })

    it('should handle missing email gracefully', async () => {
      const userWithoutEmail = { ...mockSupabaseUser, email: undefined }

      await expect(authService.syncUserWithDatabase(userWithoutEmail))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should handle undefined user input', async () => {
      return await expect(authService.syncUserWithDatabase(undefined))
        .rejects.toThrow('Supabase user is required')
    })

    it('should handle email service failures gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.user.upsert.mockResolvedValue(mockDbUser)
      mockPrismaService.subscription.findFirst.mockResolvedValue(null)
      mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'))

      // Should not throw despite email failure
      const result = await authService.syncUserWithDatabase(mockSupabaseUser)
      expect(result.id).toBe('test-user-id')
    })

    it('should use full_name when name is not available', async () => {
      const userWithFullName = {
        ...mockSupabaseUser,
        user_metadata: {
          full_name: 'Full Name User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }

      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.user.upsert.mockResolvedValue(mockDbUser)
      mockPrismaService.subscription.findFirst.mockResolvedValue(null)

      await authService.syncUserWithDatabase(userWithFullName)

      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            name: 'Full Name User'
          })
        })
      )
    })
  })

  describe('getUserBySupabaseId', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await authService.getUserBySupabaseId('test-id')

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      })
      expect(result).toBeDefined()
      expect(result?.id).toBe('test-id')
    })

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      const result = await authService.getUserBySupabaseId('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Updated Name',
        phone: '+1234567890',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser)

      const updates = {
        name: 'Updated Name',
        phone: '+1234567890',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      }

      const result = await authService.updateUserProfile('test-id', updates)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          ...updates,
          updatedAt: expect.any(Date)
        }
      })
      expect(result.user.name).toBe('Updated Name')
    })
  })

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await authService.getUserByEmail('test@example.com')

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      })
      expect(result?.email).toBe('test@example.com')
    })
  })

  describe('userHasRole', () => {
    it('should return true when user has the specified role', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await authService.userHasRole('test-id', 'OWNER')

      expect(result).toBe(true)
    })

    it('should return false when user has different role', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'TENANT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await authService.userHasRole('test-id', 'OWNER')

      expect(result).toBe(false)
    })

    it('should return false when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      const result = await authService.userHasRole('non-existent-id', 'OWNER')

      expect(result).toBe(false)
    })
  })

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(70)  // owners
        .mockResolvedValueOnce(20)  // managers
        .mockResolvedValueOnce(10)  // tenants

      const result = await authService.getUserStats()

      expect(result).toEqual({
        total: 100,
        byRole: {
          owners: 70,
          managers: 20,
          tenants: 10
        }
      })
    })
  })

  describe('createUser', () => {
    const mockUserData = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'StrongPassword123!'
    }

    const mockSupabaseResponse = {
      user: {
        id: 'new-user-id',
        email: 'newuser@example.com',
        user_metadata: {
          name: 'New User'
        }
      }
    }

    it('should create user successfully', async () => {
      mockSecurityUtils.validatePassword.mockReturnValue({
        valid: true,
        score: 4,
        errors: []
      })

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: mockSupabaseResponse,
        error: null
      })

      mockPrismaService.user.upsert.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      mockEmailService.sendWelcomeEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      })

      const result = await authService.createUser(mockUserData)

      expect(mockSecurityUtils.validatePassword).toHaveBeenCalledWith('StrongPassword123!')
      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        email_confirm: false,
        user_metadata: {
          name: 'New User',
          full_name: 'New User'
        }
      })

      expect(result).toEqual({
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
          name: 'New User'
        },
        access_token: 'temp_token_email_confirmation_required',
        refresh_token: 'temp_refresh_token_email_confirmation_required'
      })
    })

    it('should validate required fields', async () => {
      mockErrorHandler.createBusinessError.mockReturnValue(new Error('Email and name are required'))

      await expect(authService.createUser({ email: '', name: '' }))
        .rejects.toThrow()

      expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
        'BAD_REQUEST',
        'Email and name are required',
        expect.any(Object)
      )
    })

    it('should validate password strength', async () => {
      mockSecurityUtils.validatePassword.mockReturnValue({
        valid: false,
        score: 1,
        errors: ['Password too weak']
      })

      mockErrorHandler.createBusinessError.mockReturnValue(new Error('Password does not meet security requirements'))

      await expect(authService.createUser(mockUserData))
        .rejects.toThrow()

      expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
        'BAD_REQUEST',
        'Password does not meet security requirements',
        expect.any(Object)
      )
    })

    it('should handle Supabase user creation errors', async () => {
      mockSecurityUtils.validatePassword.mockReturnValue({
        valid: true,
        score: 4,
        errors: []
      })

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'User already registered', status: 400 }
      })

      mockErrorHandler.createBusinessError.mockReturnValue(new Error('User with this email already exists'))

      await expect(authService.createUser(mockUserData))
        .rejects.toThrow()

      expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
        'CONFLICT',
        'User with this email already exists',
        expect.any(Object)
      )
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockPrismaService.user.delete.mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com'
      })

      await authService.deleteUser('test-id')

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      })
    })
  })

  describe('testSupabaseConnection', () => {
    it('should return connection status when successful', async () => {
      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await authService.testSupabaseConnection()

      expect(result).toEqual({
        connected: true,
        auth: {
          session: 'none',
          url: 'https://test.supabase.co...'
        }
      })
    })

    it('should handle connection errors', async () => {
      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' }
      })

      mockErrorHandler.createBusinessError.mockReturnValue(new Error('Authentication service connection failed'))

      await expect(authService.testSupabaseConnection())
        .rejects.toThrow()
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle malformed tokens', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token format' }
      })

      await expect(authService.validateSupabaseToken('malformed_token'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should handle empty token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No token provided' }
      })

      await expect(authService.validateSupabaseToken(''))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should handle sync failures gracefully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        user_metadata: { name: 'Test User' }
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockPrismaService.user.upsert.mockRejectedValue(new Error('Database error'))

      // Sync failures are wrapped in UnauthorizedException for security
      await expect(authService.validateSupabaseToken('valid-token'))
        .rejects.toThrow('Token validation failed')
    })
  })
})
