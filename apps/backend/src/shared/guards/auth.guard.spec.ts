import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import type { ExecutionContext} from '@nestjs/common';
import { UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from './auth.guard'
import { SilentLogger } from '../../__test__/silent-logger'
import type { FastifyRequest } from 'fastify'
import type { ValidatedUser } from '@repo/shared'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn()
      })
    })
  })
}

// Mock the Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('AuthGuard', () => {
  let guard: AuthGuard
  let reflector: Reflector
  let mockExecutionContext: ExecutionContext
  let mockRequest: Partial<FastifyRequest>

  // Test user data following Supabase patterns
  const testUser: ValidatedUser = {
    id: `test-user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    role: 'OWNER',
    supabaseId: `sb-user-${Date.now()}`,
    stripeCustomerId: null,
    organizationId: null,
    avatarUrl: null,
    phone: null,
    bio: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

  beforeEach(async () => {
    // Set test environment variables
    process.env.SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key'
    process.env.NODE_ENV = 'test'

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn()
          }
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
            info: jest.fn()
          }
        }
      ]
    }).setLogger(new SilentLogger()).compile()

    guard = module.get<AuthGuard>(AuthGuard)
    reflector = module.get<Reflector>(Reflector)

    // Mock execution context
    mockRequest = {
      headers: {},
      params: {},
      query: {},
      body: {}
    }

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest
      }),
      getHandler: jest.fn(),
      getClass: jest.fn()
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('public routes', () => {
    it('allows access to public routes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

      const result = await guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })
  })

  describe('token validation', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false) // Not public
    })

    it('throws UnauthorizedException when no token provided', async () => {
      mockRequest.headers = {}

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when token format is invalid', async () => {
      mockRequest.headers = { authorization: 'invalid-token' }

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException)
    })

    it('validates token and allows access for authenticated user', async () => {
      mockRequest.headers = { authorization: `Bearer ${validToken}` }

      // Mock successful Supabase auth validation
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: testUser.supabaseId,
            email: testUser.email,
            email_confirmed_at: new Date().toISOString()
          }
        },
        error: null
      })

      // Mock database user lookup
      const mockQuery = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.name,
              role: testUser.role,
              supabaseId: testUser.supabaseId,
              stripeCustomerId: null,
              avatarUrl: null,
              phone: null,
              bio: null,
              createdAt: testUser.createdAt.toISOString(),
              updatedAt: testUser.updatedAt.toISOString()
            }
          })
        })
      }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      })

      const result = await guard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(validToken)
    })

    it('throws UnauthorizedException when user not found in database', async () => {
      mockRequest.headers = { authorization: `Bearer ${validToken}` }

      // Mock successful Supabase auth but no database user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'unknown-user',
            email: 'unknown@example.com',
            email_confirmed_at: new Date().toISOString()
          }
        },
        error: null
      })

      // Mock empty database result
      const mockQuery = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null })
        })
      }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      })

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when email not confirmed', async () => {
      mockRequest.headers = { authorization: `Bearer ${validToken}` }

      // Mock Supabase user without email confirmation
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: testUser.supabaseId,
            email: testUser.email,
            email_confirmed_at: null // Not confirmed
          }
        },
        error: null
      })

      await expect(guard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException)
    })
  })

  describe('development auth bypass', () => {
    it('bypasses auth when DISABLE_AUTH=true in non-production', async () => {
      process.env.NODE_ENV = 'development'
      process.env.DISABLE_AUTH = 'true'

      // Recreate guard to pick up new env vars
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthGuard,
          Reflector,
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              verbose: jest.fn(),
              info: jest.fn()
            }
          }
        ]
      }).compile()
      const devGuard = module.get<AuthGuard>(AuthGuard)

      const result = await devGuard.canActivate(mockExecutionContext)

      expect(result).toBe(true)
    })

    it('does not bypass auth in production even with DISABLE_AUTH=true', async () => {
      process.env.NODE_ENV = 'production'
      process.env.DISABLE_AUTH = 'true'
      mockRequest.headers = {} // No auth header

      // Recreate guard to pick up new env vars with proper providers
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn().mockReturnValue(false) // Not public
            }
          },
          {
            provide: Logger,
            useValue: {
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              verbose: jest.fn(),
              info: jest.fn()
            }
          }
        ]
      }).compile()
      const prodGuard = module.get<AuthGuard>(AuthGuard)

      await expect(prodGuard.canActivate(mockExecutionContext))
        .rejects.toThrow(UnauthorizedException)
    })
  })
})