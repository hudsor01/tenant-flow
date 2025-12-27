import { Test } from '@nestjs/testing'
import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createMockUser } from '../../test-utils/mocks'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { SubscriptionGuard, SKIP_SUBSCRIPTION_CHECK_KEY } from './subscription.guard'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard
  let reflector: Reflector
  let supabaseService: jest.Mocked<SupabaseService>

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn()
    }

    const mockSupabaseService = {
      rpcWithRetries: jest.fn(),
      getAdminClient: jest.fn()
    }

    const module = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    }).compile()

    guard = module.get<SubscriptionGuard>(SubscriptionGuard)
    reflector = module.get<Reflector>(Reflector)
    supabaseService = module.get(SupabaseService) as jest.Mocked<SupabaseService>
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockMetadata = (options?: { isPublic?: boolean; skip?: boolean }) => {
    ; (reflector.getAllAndOverride as jest.Mock).mockImplementation((key: string) => {
      if (key === 'isPublic') return options?.isPublic ?? false
      if (key === SKIP_SUBSCRIPTION_CHECK_KEY) return options?.skip ?? false
      return false
    })
  }

  const createContext = (request: Partial<AuthenticatedRequest>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () =>
        ({
          user: request.user,
          url: request.url || '/api/v1/properties'
        } as AuthenticatedRequest)
      }),
      getHandler: () => ({}),
      getClass: () => ({})
    } as ExecutionContext
  }

  it('allows tenant user_type regardless of subscription state', async () => {
    mockMetadata()
    supabaseService.rpcWithRetries.mockResolvedValue({ data: false, error: null })

    const result = await guard.canActivate(
      createContext({
        user: createMockUser({
          id: 'tenant-1',
          email: 'tenant@example.com',
          app_metadata: { user_type: 'TENANT' }
        })
      })
    )

    expect(result).toBe(true)
    expect(supabaseService.rpcWithRetries).not.toHaveBeenCalled()
  })

  it('allows owner access when feature access RPC returns true', async () => {
    mockMetadata()
    supabaseService.rpcWithRetries.mockResolvedValue({ data: true, error: null })

    const result = await guard.canActivate(
      createContext({
        user: createMockUser({
          id: 'owner-1',
          email: 'owner@example.com',
          app_metadata: { user_type: 'OWNER' }
        })
      })
    )

    expect(result).toBe(true)
    expect(supabaseService.getAdminClient).not.toHaveBeenCalled()
  })

  it('bypasses guard when SkipSubscriptionCheck metadata is present', async () => {
    mockMetadata({ skip: true })

    const result = await guard.canActivate(
      createContext({
        user: createMockUser({
          id: 'owner-2',
          email: 'owner@example.com',
          app_metadata: { user_type: 'OWNER' }
        })
      })
    )

    expect(result).toBe(true)
    expect(supabaseService.rpcWithRetries).not.toHaveBeenCalled()
  })

  test.each([
    '/api/v1/properties',
    '/api/v1/tenants',
    '/api/v1/leases',
    '/api/v1/documents'
  ])('blocks unpaid owners from %s', async path => {
    mockMetadata()
    supabaseService.rpcWithRetries.mockResolvedValue({ data: false, error: null })

    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          stripe_customer_id: null
        },
        error: null
      })
    }

    supabaseService.getAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue(queryBuilder)
    } as ReturnType<SupabaseService["getAdminClient"]>)

    await expect(
      guard.canActivate(
        createContext({
          user: createMockUser({
            id: 'owner-3',
            email: 'owner@example.com',
            app_metadata: { user_type: 'OWNER' }
          }),
          url: path
        })
      )
    ).rejects.toThrow(ForbiddenException)

    expect(queryBuilder.select).toHaveBeenCalledWith('stripe_customer_id')
  })
})
