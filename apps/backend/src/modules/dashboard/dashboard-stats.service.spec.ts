import { Test } from '@nestjs/testing'
import { DashboardStatsService } from './dashboard-stats.service'
import { SupabaseService } from '../../database/supabase.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { RedisCacheService } from '../../cache/cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import { DashboardTrendsService } from './dashboard-trends.service'
import { DashboardPerformanceService } from './dashboard-performance.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { EMPTY_DASHBOARD_STATS } from '@repo/shared/constants/empty-states'
import type { DashboardStats } from '@repo/shared/types/stats'

describe('DashboardStatsService', () => {
  let service: DashboardStatsService
  let mockAdminClient: { from: jest.Mock }
  let mockAnalyticsService: jest.Mocked<
    Pick<DashboardAnalyticsService, 'getDashboardStats' | 'getPropertyPerformance'>
  >
  let mockCacheGet: jest.Mock
  let mockCacheSet: jest.Mock
  let mockTrendsService: { getActivity: jest.Mock }
  let mockPerformanceService: { getPropertyPerformance: jest.Mock }

  const mockUserId = 'user-abc-123'
  const mockToken = 'mock-jwt-token'

  const mockDashboardStats: DashboardStats = {
    properties: { total: 5, active: 4, inactive: 1, occupancyRate: 80 },
    tenants: { total: 10, active: 8, inactive: 2 },
    units: {
      total: 20,
      occupied: 16,
      vacant: 4,
      occupancyRate: 80,
      totalPotentialRent: 20000,
      totalActualRent: 16000
    },
    leases: { total: 10, active: 8, expired: 2, occupancyRate: 80 },
    maintenance: {
      total: 5,
      open: 2,
      inProgress: 1,
      completed: 2,
      avgResolutionTime: 3,
      totalCost: 1500
    },
    revenue: { monthly: 16000, yearly: 192000, growth: 5 },
    maintenanceRequests: 5
  }

  const mockPropertyPerformance = [
    {
      property: 'Property A',
      property_id: 'prop-1',
      address_line1: '123 Main St',
      totalUnits: 10,
      occupiedUnits: 8,
      vacantUnits: 2,
      occupancyRate: 80,
      revenue: 96000,
      monthlyRevenue: 8000,
      potentialRevenue: 100000,
      property_type: 'apartment',
      status: 'PARTIAL' as const,
      trend: 'up' as const,
      trendPercentage: 5
    }
  ]

  const mockActivity = {
    activities: Array.from({ length: 10 }, (_, i) => ({
      id: `act-${i}`,
      activity_type: 'payment' as const,
      entity_id: `entity-${i}`,
      property_id: null,
      tenant_id: null,
      unit_id: null,
      owner_id: mockUserId,
      status: null,
      priority: null,
      action: 'view',
      amount: null,
      activity_timestamp: '2024-01-15T10:00:00Z',
      details: { entity_type: 'payment', description: 'Rent paid' }
    }))
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
    mockAdminClient = { from: jest.fn() }
    mockCacheGet = jest.fn().mockResolvedValue(null)
    mockCacheSet = jest.fn().mockResolvedValue(undefined)

    mockAnalyticsService = {
      getDashboardStats: jest.fn().mockResolvedValue(mockDashboardStats),
      getPropertyPerformance: jest.fn().mockResolvedValue(mockPropertyPerformance)
    } as jest.Mocked<Pick<DashboardAnalyticsService, 'getDashboardStats' | 'getPropertyPerformance'>>

    mockTrendsService = {
      getActivity: jest.fn().mockResolvedValue(mockActivity)
    }
    mockPerformanceService = {
      getPropertyPerformance: jest.fn().mockResolvedValue(mockPropertyPerformance)
    }

    jest
      .spyOn(RedisCacheService, 'getUserKey')
      .mockReturnValue('user:user-abc-123:dashboard:stats')

    const module = await Test.createTestingModule({
      providers: [
        DashboardStatsService,
        {
          provide: SupabaseService,
          useValue: { getAdminClient: jest.fn(() => mockAdminClient) }
        },
        { provide: DashboardAnalyticsService, useValue: mockAnalyticsService },
        {
          provide: RedisCacheService,
          useValue: { get: mockCacheGet, set: mockCacheSet }
        },
        { provide: AppLogger, useValue: new SilentLogger() },
        { provide: DashboardTrendsService, useValue: mockTrendsService },
        { provide: DashboardPerformanceService, useValue: mockPerformanceService }
      ]
    })
      .setLogger(new SilentLogger())
      .compile()

    service = module.get<DashboardStatsService>(DashboardStatsService)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  // ================================================================
  // getStats
  // ================================================================
  describe('getStats', () => {
    it('returns EMPTY_DASHBOARD_STATS when user_id is not provided', async () => {
      const result = await service.getStats(undefined)
      expect(result).toEqual(EMPTY_DASHBOARD_STATS)
      expect(mockAnalyticsService.getDashboardStats).not.toHaveBeenCalled()
    })

    it('returns cached stats on cache hit', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const result = await service.getStats(mockUserId, mockToken)
      expect(result).toEqual(mockDashboardStats)
      expect(mockAnalyticsService.getDashboardStats).not.toHaveBeenCalled()
    })

    it('delegates to DashboardAnalyticsService on cache miss', async () => {
      const result = await service.getStats(mockUserId, mockToken)
      expect(result).toEqual(mockDashboardStats)
      expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
        mockUserId,
        mockToken
      )
    })

    it('caches result with short tier after successful fetch', async () => {
      await service.getStats(mockUserId, mockToken)
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        mockDashboardStats,
        expect.objectContaining({ tier: 'short' })
      )
    })

    it('returns EMPTY_DASHBOARD_STATS when analytics service throws', async () => {
      mockAnalyticsService.getDashboardStats.mockRejectedValue(new Error('RPC error'))
      const result = await service.getStats(mockUserId, mockToken)
      expect(result).toEqual(EMPTY_DASHBOARD_STATS)
    })

    it('passes correct user_id to analytics service', async () => {
      const specificUserId = 'specific-user-999'
      await service.getStats(specificUserId, mockToken)
      expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
        specificUserId,
        mockToken
      )
    })

    it('works without optional token parameter', async () => {
      const result = await service.getStats(mockUserId)
      expect(result).toEqual(mockDashboardStats)
      expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalledWith(
        mockUserId,
        undefined
      )
    })

    it('does not cache when analytics service throws', async () => {
      mockAnalyticsService.getDashboardStats.mockRejectedValue(new Error('fail'))
      await service.getStats(mockUserId, mockToken)
      expect(mockCacheSet).not.toHaveBeenCalled()
    })
  })

  // ================================================================
  // getMetrics
  // ================================================================
  describe('getMetrics', () => {
    it('returns correctly shaped metrics response', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const result = await service.getMetrics(mockUserId, mockToken)
      expect(result).toEqual({
        totalProperties: mockDashboardStats.properties.total,
        totalUnits: mockDashboardStats.units.total,
        totalTenants: mockDashboardStats.tenants.total,
        totalLeases: mockDashboardStats.leases.total,
        occupancyRate: mockDashboardStats.units.occupancyRate,
        monthlyRevenue: mockDashboardStats.revenue.monthly,
        maintenanceRequests: mockDashboardStats.maintenance.total,
        timestamp: expect.any(String)
      })
    })

    it('returns zeroed metrics when stats retrieval fails', async () => {
      mockAnalyticsService.getDashboardStats.mockRejectedValue(new Error('DB error'))
      const result = await service.getMetrics(mockUserId, mockToken)
      expect(result).toEqual({
        totalProperties: 0,
        totalUnits: 0,
        totalTenants: 0,
        totalLeases: 0,
        occupancyRate: 0,
        monthlyRevenue: 0,
        maintenanceRequests: 0,
        timestamp: expect.any(String)
      })
    })

    it('includes a valid ISO timestamp', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const result = await service.getMetrics(mockUserId, mockToken)
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })

    it('delegates to getStats internally', async () => {
      const getStatsSpy = jest
        .spyOn(service, 'getStats')
        .mockResolvedValue(mockDashboardStats)
      await service.getMetrics(mockUserId, mockToken)
      expect(getStatsSpy).toHaveBeenCalledWith(mockUserId, mockToken)
    })
  })

  // ================================================================
  // getSummary
  // ================================================================
  describe('getSummary', () => {
    it('returns complete summary response shape', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const result = await service.getSummary(mockUserId, mockToken)
      expect(result).toMatchObject({
        overview: {
          properties: mockDashboardStats.properties.total,
          units: mockDashboardStats.units.total,
          tenants: mockDashboardStats.tenants.active,
          occupancyRate: mockDashboardStats.units.occupancyRate
        },
        revenue: {
          monthly: mockDashboardStats.revenue.monthly,
          yearly: mockDashboardStats.revenue.yearly,
          growth: mockDashboardStats.revenue.growth
        },
        maintenance: {
          open: mockDashboardStats.maintenance.open,
          inProgress: mockDashboardStats.maintenance.inProgress,
          avgResolutionTime: mockDashboardStats.maintenance.avgResolutionTime
        },
        timestamp: expect.any(String)
      })
    })

    it('calls trendsService.getActivity when token is provided', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      await service.getSummary(mockUserId, mockToken)
      expect(mockTrendsService.getActivity).toHaveBeenCalledWith(
        mockUserId,
        mockToken
      )
    })

    it('skips trendsService and returns empty activities when token is absent', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const result = await service.getSummary(mockUserId)
      expect(mockTrendsService.getActivity).not.toHaveBeenCalled()
      expect(result.recentActivity).toEqual([])
    })

    it('limits recent activity to 5 items', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      // mockActivity already has 10 items
      const result = await service.getSummary(mockUserId, mockToken)
      expect(result.recentActivity.length).toBeLessThanOrEqual(5)
    })

    it('limits top performing properties to 3', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const manyProperties = Array.from({ length: 10 }, (_, i) => ({
        ...mockPropertyPerformance[0],
        property_id: `prop-${i}`,
        property: `Property ${i}`
      }))
      mockPerformanceService.getPropertyPerformance.mockResolvedValue(manyProperties)
      const result = await service.getSummary(mockUserId, mockToken)
      expect(result.topPerformingProperties.length).toBeLessThanOrEqual(3)
    })

    it('returns zeroed overview stats when getDashboardStats fails', async () => {
      // When getDashboardStats fails, getStats() catches internally and returns EMPTY_DASHBOARD_STATS
      // The getSummary Promise.all still resolves (with empty stats), so recentActivity/performance still work
      mockAnalyticsService.getDashboardStats.mockRejectedValue(new Error('DB fail'))
      const result = await service.getSummary(mockUserId, mockToken)
      expect(result.overview).toEqual({ properties: 0, units: 0, tenants: 0, occupancyRate: 0 })
      expect(result.revenue).toEqual({ monthly: 0, yearly: 0, growth: 0 })
      expect(result.maintenance).toEqual({ open: 0, inProgress: 0, avgResolutionTime: 0 })
    })

    it('returns empty summary when trendsService throws', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      mockTrendsService.getActivity.mockRejectedValue(new Error('Activity service down'))
      const result = await service.getSummary(mockUserId, mockToken)
      expect(result).toMatchObject({
        overview: { properties: 0, units: 0, tenants: 0, occupancyRate: 0 },
        revenue: { monthly: 0, yearly: 0, growth: 0 },
        maintenance: { open: 0, inProgress: 0, avgResolutionTime: 0 },
        recentActivity: [],
        topPerformingProperties: []
      })
    })

    it('calls performanceService.getPropertyPerformance', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      await service.getSummary(mockUserId, mockToken)
      expect(mockPerformanceService.getPropertyPerformance).toHaveBeenCalledWith(
        mockUserId,
        mockToken
      )
    })

    it('includes timestamp in summary', async () => {
      mockCacheGet.mockResolvedValue(mockDashboardStats)
      const result = await service.getSummary(mockUserId, mockToken)
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })
  })

  // ================================================================
  // getUptime
  // ================================================================
  describe('getUptime', () => {
    it('returns operational status when DB query succeeds', async () => {
      const qb = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.getUptime()
      expect(result.status).toBe('operational')
      expect(result.uptimePercentage).toBe(99.95)
      expect(result.slaStatus).toBe('excellent')
    })

    it('returns degraded status when DB query returns an error', async () => {
      const qb = createChainBuilder({ data: null, error: { message: 'DB down' } })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.getUptime()
      expect(result.status).toBe('degraded')
      expect(result.uptimePercentage).toBe(95.0)
    })

    it('returns default metrics when an unexpected error is thrown', async () => {
      mockAdminClient.from.mockImplementation(() => {
        throw new Error('Connection refused')
      })
      const result = await service.getUptime()
      expect(result.status).toBe('degraded')
      expect(result.uptimePercentage).toBe(95.0)
      expect(result.slaStatus).toBe('acceptable')
    })

    it('queries the properties table for the health check', async () => {
      const qb = createChainBuilder({ data: [], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      await service.getUptime()
      expect(mockAdminClient.from).toHaveBeenCalledWith('properties')
    })

    it('includes numeric responseTime in result', async () => {
      const qb = createChainBuilder({ data: [], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.getUptime()
      expect(typeof result.responseTime).toBe('number')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('sets lastIncident to null when operational', async () => {
      const qb = createChainBuilder({ data: [], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.getUptime()
      expect(result.lastIncident).toBeNull()
    })

    it('includes valid ISO timestamp', async () => {
      const qb = createChainBuilder({ data: [], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.getUptime()
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })

    it('returns uptime as percentage string', async () => {
      const qb = createChainBuilder({ data: [], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.getUptime()
      expect(result.uptime).toMatch(/\d+\.?\d*%/)
    })
  })
})
