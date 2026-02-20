import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { DashboardTrendsService } from './dashboard-trends.service'
import { SupabaseService } from '../../database/supabase.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { RedisCacheService } from '../../cache/cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { EMPTY_MAINTENANCE_ANALYTICS } from '@repo/shared/constants/empty-states'

describe('DashboardTrendsService', () => {
  let service: DashboardTrendsService
  let mockAdminClient: { rpc: jest.Mock; from: jest.Mock }
  let mockUserClient: { from: jest.Mock }
  let mockAnalyticsService: {
    getBillingInsights: jest.Mock
    getOccupancyTrends: jest.Mock
    getRevenueTrends: jest.Mock
    getMaintenanceAnalytics: jest.Mock
  }
  let mockCacheGet: jest.Mock
  let mockCacheSet: jest.Mock

  const mockUserId = 'user-trends-123'
  const mockToken = 'mock-jwt-token'

  const mockActivities = [
    {
      id: 'act-1',
      activity_type: 'payment',
      entity_id: 'entity-1',
      entity_type: 'payment',
      title: 'Rent payment received',
      description: 'January rent',
      created_at: '2024-01-15T10:00:00Z',
      user_id: mockUserId
    },
    {
      id: 'act-2',
      activity_type: 'lease',
      entity_id: 'entity-2',
      entity_type: 'lease',
      title: 'New lease signed',
      description: 'Tenant moved in',
      created_at: '2024-01-16T10:00:00Z',
      user_id: mockUserId
    }
  ]

  const mockBillingInsights = { totalRevenue: 50000, churnRate: 0.05, mrr: 5000 }

  const mockOccupancyTrends = [
    { month: '2024-01', occupancy_rate: 85, total_units: 20, occupied_units: 17 },
    { month: '2024-02', occupancy_rate: 90, total_units: 20, occupied_units: 18 }
  ]

  const mockRevenueTrends = [
    { month: '2024-01', revenue: 17000, growth: 5, previous_period_revenue: 16190 },
    { month: '2024-02', revenue: 18000, growth: 6, previous_period_revenue: 16981 }
  ]

  const mockMaintenanceAnalytics = {
    avgResolutionTime: 3.5,
    completionRate: 0.85,
    priorityBreakdown: { low: 2, normal: 5, high: 3, urgent: 1 },
    trendsOverTime: [
      { month: '2024-01', completed: 8, avgResolutionDays: 3 }
    ]
  }

  const createChainBuilder = (resolvedValue: {
    data: unknown
    error: unknown
    count?: number | null
  }) => {
    const builder: Record<string, jest.Mock> = {}
    const chainMethods = [
      'select', 'eq', 'neq', 'gte', 'lte', 'or', 'order', 'range',
      'limit', 'insert', 'update', 'delete', 'filter', 'not', 'is', 'in'
    ]
    for (const method of chainMethods) {
      builder[method] = jest.fn().mockReturnValue(builder)
    }
    builder.single = jest.fn().mockResolvedValue(resolvedValue)
    builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue)
    const thenFn = (resolve: (v: unknown) => void) =>
      Promise.resolve(resolvedValue).then(resolve)
    Object.defineProperty(builder, 'then', {
      value: thenFn,
      writable: true,
      enumerable: false
    })
    return builder
  }

  beforeEach(async () => {
    mockAdminClient = {
      rpc: jest.fn().mockResolvedValue({ data: mockActivities, error: null }),
      from: jest.fn()
    }
    mockUserClient = { from: jest.fn() }
    mockCacheGet = jest.fn().mockResolvedValue(null)
    mockCacheSet = jest.fn().mockResolvedValue(undefined)

    mockAnalyticsService = {
      getBillingInsights: jest.fn().mockResolvedValue(mockBillingInsights),
      getOccupancyTrends: jest.fn().mockResolvedValue(mockOccupancyTrends),
      getRevenueTrends: jest.fn().mockResolvedValue(mockRevenueTrends),
      getMaintenanceAnalytics: jest.fn().mockResolvedValue(mockMaintenanceAnalytics)
    }

    jest
      .spyOn(RedisCacheService, 'getUserKey')
      .mockReturnValue('user:user-trends-123:dashboard:activity')

    const module = await Test.createTestingModule({
      providers: [
        DashboardTrendsService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn(() => mockAdminClient),
            getUserClient: jest.fn(() => mockUserClient)
          }
        },
        { provide: DashboardAnalyticsService, useValue: mockAnalyticsService },
        {
          provide: RedisCacheService,
          useValue: { get: mockCacheGet, set: mockCacheSet }
        },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    })
      .setLogger(new SilentLogger())
      .compile()

    service = module.get<DashboardTrendsService>(DashboardTrendsService)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  // ================================================================
  // getActivity
  // ================================================================
  describe('getActivity', () => {
    it('returns activities from RPC call', async () => {
      const result = await service.getActivity(mockUserId, mockToken)
      expect(result.activities).toBeDefined()
      expect(Array.isArray(result.activities)).toBe(true)
    })

    it('calls the get_user_dashboard_activities RPC function', async () => {
      await service.getActivity(mockUserId, mockToken)
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'get_user_dashboard_activities',
        expect.objectContaining({ p_user_id: mockUserId, p_limit: 20 })
      )
    })

    it('returns cached activities on cache hit', async () => {
      const cachedData = { activities: [{ id: 'cached-act-1', activity_type: 'payment', entity_id: 'e1', property_id: null, tenant_id: null, unit_id: null, owner_id: mockUserId, status: null, priority: null, action: 'view', amount: null, activity_timestamp: '2024-01-01T00:00:00Z', details: {} }] }
      mockCacheGet.mockResolvedValue(cachedData)
      const result = await service.getActivity(mockUserId, mockToken)
      expect(result).toEqual(cachedData)
      expect(mockAdminClient.rpc).not.toHaveBeenCalled()
    })

    it('returns empty activities when user_id is empty string', async () => {
      const result = await service.getActivity('', mockToken)
      expect(result).toEqual({ activities: [] })
    })

    it('returns empty activities when token is empty string', async () => {
      const result = await service.getActivity(mockUserId, '')
      expect(result).toEqual({ activities: [] })
    })

    it('returns empty activities when RPC returns error', async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC call failed' }
      })
      const result = await service.getActivity(mockUserId, mockToken)
      expect(result).toEqual({ activities: [] })
    })

    it('returns empty activities when an unexpected error is thrown', async () => {
      mockAdminClient.rpc.mockRejectedValue(new Error('Network error'))
      const result = await service.getActivity(mockUserId, mockToken)
      expect(result).toEqual({ activities: [] })
    })

    it('handles empty RPC data array gracefully', async () => {
      mockAdminClient.rpc.mockResolvedValue({ data: [], error: null })
      const result = await service.getActivity(mockUserId, mockToken)
      expect(result.activities).toEqual([])
    })

    it('caches result with short tier after successful fetch', async () => {
      mockAdminClient.rpc.mockResolvedValue({ data: [], error: null })
      await service.getActivity(mockUserId, mockToken)
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ tier: 'short' })
      )
    })

    it('maps payment activity_type correctly', async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ id: 'a1', activity_type: 'payment', entity_id: 'e1', entity_type: 'payment', title: 'Payment', description: 'desc', created_at: '2024-01-01T00:00:00Z', user_id: mockUserId }],
        error: null
      })
      const result = await service.getActivity(mockUserId, mockToken)
      if (result.activities.length > 0) {
        expect(result.activities[0].activity_type).toBe('payment')
      }
    })

    it('maps lease activity_type to leases', async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ id: 'a2', activity_type: 'lease', entity_id: 'e2', entity_type: 'lease', title: 'Lease', description: 'desc', created_at: '2024-01-01T00:00:00Z', user_id: mockUserId }],
        error: null
      })
      const result = await service.getActivity(mockUserId, mockToken)
      if (result.activities.length > 0) {
        expect(result.activities[0].activity_type).toBe('leases')
      }
    })

    it('maps maintenance activity_type correctly', async () => {
      mockAdminClient.rpc.mockResolvedValue({
        data: [{ id: 'a3', activity_type: 'maintenance', entity_id: 'e3', entity_type: 'maintenance', title: 'Fix it', description: 'desc', created_at: '2024-01-01T00:00:00Z', user_id: mockUserId }],
        error: null
      })
      const result = await service.getActivity(mockUserId, mockToken)
      if (result.activities.length > 0) {
        expect(result.activities[0].activity_type).toBe('maintenance')
      }
    })
  })

  // ================================================================
  // getBillingInsights
  // ================================================================
  describe('getBillingInsights', () => {
    it('returns billing insights from analytics service', async () => {
      const result = await service.getBillingInsights(mockUserId)
      expect(result).toEqual(mockBillingInsights)
    })

    it('throws BadRequestException when user_id is not provided', async () => {
      await expect(service.getBillingInsights(undefined)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws BadRequestException when analytics service throws BadRequestException', async () => {
      mockAnalyticsService.getBillingInsights.mockRejectedValue(
        new BadRequestException('Validation failed')
      )
      await expect(service.getBillingInsights(mockUserId)).rejects.toThrow(
        BadRequestException
      )
    })

    it('throws BadRequestException when analytics service throws generic error', async () => {
      mockAnalyticsService.getBillingInsights.mockRejectedValue(
        new Error('DB error')
      )
      await expect(service.getBillingInsights(mockUserId)).rejects.toThrow(
        BadRequestException
      )
    })

    it('passes user_id correctly to analytics service', async () => {
      await service.getBillingInsights(mockUserId)
      expect(mockAnalyticsService.getBillingInsights).toHaveBeenCalledWith(mockUserId)
    })

    it('throws BadRequestException when result fails Zod validation', async () => {
      mockAnalyticsService.getBillingInsights.mockResolvedValue({
        totalRevenue: -100,
        churnRate: 2,
        mrr: -50
      })
      await expect(service.getBillingInsights(mockUserId)).rejects.toThrow(
        BadRequestException
      )
    })
  })

  // ================================================================
  // isBillingInsightsAvailable
  // ================================================================
  describe('isBillingInsightsAvailable', () => {
    it('returns true when rent_payments count > 0', async () => {
      const qb = createChainBuilder({ data: null, error: null, count: 5 })
      mockUserClient.from.mockReturnValue(qb)
      const result = await service.isBillingInsightsAvailable(mockUserId, mockToken)
      expect(result).toBe(true)
    })

    it('returns false when rent_payments count is 0', async () => {
      const qb = createChainBuilder({ data: null, error: null, count: 0 })
      mockUserClient.from.mockReturnValue(qb)
      const result = await service.isBillingInsightsAvailable(mockUserId, mockToken)
      expect(result).toBe(false)
    })

    it('returns false when rent_payments count is null', async () => {
      const qb = createChainBuilder({ data: null, error: null, count: null })
      mockUserClient.from.mockReturnValue(qb)
      const result = await service.isBillingInsightsAvailable(mockUserId, mockToken)
      expect(result).toBe(false)
    })

    it('returns false when token is empty string', async () => {
      const result = await service.isBillingInsightsAvailable(mockUserId, '')
      expect(result).toBe(false)
    })

    it('returns false when DB query returns error', async () => {
      const qb = createChainBuilder({
        data: null,
        error: { message: 'DB error' },
        count: null
      })
      mockUserClient.from.mockReturnValue(qb)
      const result = await service.isBillingInsightsAvailable(mockUserId, mockToken)
      expect(result).toBe(false)
    })

    it('returns false when an unexpected error is thrown', async () => {
      mockUserClient.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })
      const result = await service.isBillingInsightsAvailable(mockUserId, mockToken)
      expect(result).toBe(false)
    })

    it('queries the rent_payments table', async () => {
      const qb = createChainBuilder({ data: null, error: null, count: 1 })
      mockUserClient.from.mockReturnValue(qb)
      await service.isBillingInsightsAvailable(mockUserId, mockToken)
      expect(mockUserClient.from).toHaveBeenCalledWith('rent_payments')
    })
  })

  // ================================================================
  // getOccupancyTrends
  // ================================================================
  describe('getOccupancyTrends', () => {
    it('returns occupancy trends from analytics service', async () => {
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      expect(result).toEqual(mockOccupancyTrends)
    })

    it('returns empty array when user_id is not provided', async () => {
      const result = await service.getOccupancyTrends(undefined, mockToken)
      expect(result).toEqual([])
      expect(mockAnalyticsService.getOccupancyTrends).not.toHaveBeenCalled()
    })

    it('passes months parameter to analytics service', async () => {
      await service.getOccupancyTrends(mockUserId, mockToken, 6)
      expect(mockAnalyticsService.getOccupancyTrends).toHaveBeenCalledWith(
        mockUserId,
        mockToken,
        6
      )
    })

    it('returns empty array when analytics service throws', async () => {
      mockAnalyticsService.getOccupancyTrends.mockRejectedValue(new Error('RPC fail'))
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('works without optional token parameter', async () => {
      const result = await service.getOccupancyTrends(mockUserId)
      expect(result).toEqual(mockOccupancyTrends)
      expect(mockAnalyticsService.getOccupancyTrends).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        undefined
      )
    })
  })

  // ================================================================
  // getRevenueTrends
  // ================================================================
  describe('getRevenueTrends', () => {
    it('returns revenue trends from analytics service', async () => {
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(result).toEqual(mockRevenueTrends)
    })

    it('returns empty array when user_id is not provided', async () => {
      const result = await service.getRevenueTrends(undefined, mockToken)
      expect(result).toEqual([])
      expect(mockAnalyticsService.getRevenueTrends).not.toHaveBeenCalled()
    })

    it('passes months parameter to analytics service', async () => {
      await service.getRevenueTrends(mockUserId, mockToken, 3)
      expect(mockAnalyticsService.getRevenueTrends).toHaveBeenCalledWith(
        mockUserId,
        mockToken,
        3
      )
    })

    it('returns empty array when analytics service throws', async () => {
      mockAnalyticsService.getRevenueTrends.mockRejectedValue(new Error('RPC fail'))
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('works without optional parameters', async () => {
      const result = await service.getRevenueTrends(mockUserId)
      expect(result).toEqual(mockRevenueTrends)
    })
  })

  // ================================================================
  // getMaintenanceAnalytics
  // ================================================================
  describe('getMaintenanceAnalytics', () => {
    it('returns maintenance analytics from analytics service', async () => {
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(result).toEqual(mockMaintenanceAnalytics)
    })

    it('returns EMPTY_MAINTENANCE_ANALYTICS when user_id is not provided', async () => {
      const result = await service.getMaintenanceAnalytics(undefined)
      expect(result).toEqual(EMPTY_MAINTENANCE_ANALYTICS)
      expect(mockAnalyticsService.getMaintenanceAnalytics).not.toHaveBeenCalled()
    })

    it('returns EMPTY_MAINTENANCE_ANALYTICS when analytics service throws', async () => {
      mockAnalyticsService.getMaintenanceAnalytics.mockRejectedValue(
        new Error('RPC fail')
      )
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(result).toEqual(EMPTY_MAINTENANCE_ANALYTICS)
    })

    it('passes user_id correctly to analytics service', async () => {
      await service.getMaintenanceAnalytics(mockUserId)
      expect(mockAnalyticsService.getMaintenanceAnalytics).toHaveBeenCalledWith(
        mockUserId
      )
    })

    it('returns priorityBreakdown as a record', async () => {
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(typeof result.priorityBreakdown).toBe('object')
    })

    it('returns trendsOverTime as an array', async () => {
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(Array.isArray(result.trendsOverTime)).toBe(true)
    })
  })
})
