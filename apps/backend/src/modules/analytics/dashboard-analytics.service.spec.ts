import { Test } from '@nestjs/testing'
import { InternalServerErrorException } from '@nestjs/common'
import { DashboardAnalyticsService } from './dashboard-analytics.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { EMPTY_MAINTENANCE_ANALYTICS } from '@repo/shared/constants/empty-states'
import type { DashboardStats } from '@repo/shared/types/stats'

describe('DashboardAnalyticsService', () => {
  let service: DashboardAnalyticsService
  let mockSupabaseRpc: jest.Mock
  let mockAdminClient: { from: jest.Mock }

  const mockUserId = 'user-analytics-123'
  const mockToken = 'mock-jwt-token'

  const mockDashboardStatsRow: DashboardStats = {
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

  const mockRawProperties = [
    {
      property_id: 'prop-1',
      property_name: 'Sunset Apartments',
      address: '100 Sunset Blvd',
      total_units: 20,
      occupied_units: 18,
      vacant_units: 2,
      occupancy_rate: 90,
      annual_revenue: 216000,
      monthly_revenue: 18000,
      potential_revenue: 240000,
      property_type: 'apartment',
      status: 'PARTIAL'
    }
  ]

  const mockRawTrends = [
    {
      property_id: 'prop-1',
      total_revenue: 18000,
      previous_revenue: 17000,
      trend_percentage: 5.88,
      timeframe: '30d'
    }
  ]

  const mockOccupancyRaw = [
    { month: '2024-01', occupancy_rate: 85, total_units: 20, occupied_units: 17 },
    { month: '2024-02', occupancy_rate: 90, total_units: 20, occupied_units: 18 }
  ]

  const mockRevenueRaw = [
    { month: '2024-01', revenue: 17000, growth: 5, previous_period_revenue: 16190 },
    { month: '2024-02', revenue: '18000', growth: 6, previous_period_revenue: '16981' }
  ]

  const mockMaintenanceRaw = {
    avgResolutionTime: 3.5,
    completionRate: 0.85,
    priorityBreakdown: { low: 2, normal: 5, high: 3, urgent: 1 },
    trendsOverTime: [{ month: '2024-01', completed: 8, avgResolutionDays: 3 }]
  }

  const mockBillingRaw = { totalRevenue: 50000, churnRate: 0.05, mrr: 5000 }

  // Helper to create a chainable Supabase client builder
  const createChainBuilder = (resolvedValue: { data: unknown; error: unknown }) => {
    const builder: Record<string, jest.Mock> = {}
    const chainMethods = ['select', 'eq', 'limit', 'filter', 'order']
    for (const method of chainMethods) {
      builder[method] = jest.fn().mockReturnValue(builder)
    }
    builder.single = jest.fn().mockResolvedValue(resolvedValue)
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
    // Default: rpc returns success with dashboard stats (for getDashboardStats)
    mockSupabaseRpc = jest.fn().mockResolvedValue({
      data: [mockDashboardStatsRow],
      error: null
    })

    const module = await Test.createTestingModule({
      providers: [
        DashboardAnalyticsService,
        {
          provide: SupabaseService,
          useValue: {
            rpc: mockSupabaseRpc,
            getAdminClient: jest.fn(() => mockAdminClient)
          }
        },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    })
      .setLogger(new SilentLogger())
      .compile()

    service = module.get<DashboardAnalyticsService>(DashboardAnalyticsService)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  // ================================================================
  // getDashboardStats
  // ================================================================
  describe('getDashboardStats', () => {
    it('calls the get_dashboard_stats RPC with correct user_id', async () => {
      await service.getDashboardStats(mockUserId)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_dashboard_stats',
        expect.objectContaining({ p_user_id: mockUserId }),
        expect.any(Object)
      )
    })

    it('returns the first row from the RPC result array', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [mockDashboardStatsRow],
        error: null
      })
      const result = await service.getDashboardStats(mockUserId)
      expect(result).toEqual(mockDashboardStatsRow)
    })

    it('handles non-array single object RPC result', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: mockDashboardStatsRow,
        error: null
      })
      const result = await service.getDashboardStats(mockUserId)
      expect(result).toEqual(mockDashboardStatsRow)
    })

    it('throws InternalServerErrorException when RPC returns error', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'DB error' }
      })
      await expect(service.getDashboardStats(mockUserId)).rejects.toThrow(
        InternalServerErrorException
      )
    })

    it('throws InternalServerErrorException when RPC returns null data', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
      await expect(service.getDashboardStats(mockUserId)).rejects.toThrow(
        InternalServerErrorException
      )
    })

    it('throws InternalServerErrorException when RPC returns empty array', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: [], error: null })
      await expect(service.getDashboardStats(mockUserId)).rejects.toThrow(
        InternalServerErrorException
      )
    })

    it('throws InternalServerErrorException when supabase.rpc throws unexpectedly', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('Network error'))
      await expect(service.getDashboardStats(mockUserId)).rejects.toThrow(
        InternalServerErrorException
      )
    })

    it('passes caching options to supabase.rpc', async () => {
      await service.getDashboardStats(mockUserId)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ cache: true, cacheTier: 'short' })
      )
    })
  })

  // ================================================================
  // getPropertyPerformance
  // ================================================================
  describe('getPropertyPerformance', () => {
    it('calls both RPC functions in parallel', async () => {
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: mockRawTrends, error: null })

      await service.getPropertyPerformance(mockUserId)

      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_property_performance_cached',
        expect.objectContaining({ p_user_id: mockUserId }),
        expect.any(Object)
      )
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_property_performance_with_trends',
        expect.objectContaining({ p_user_id: mockUserId, p_timeframe: '30d' }),
        expect.any(Object)
      )
    })

    it('returns mapped PropertyPerformance array', async () => {
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: mockRawTrends, error: null })

      const result = await service.getPropertyPerformance(mockUserId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        property: 'Sunset Apartments',
        property_id: 'prop-1',
        totalUnits: 20,
        occupiedUnits: 18,
        occupancyRate: 90
      })
    })

    it('maps trend direction to "up" when current revenue > previous', async () => {
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: mockRawTrends, error: null })

      const result = await service.getPropertyPerformance(mockUserId)

      expect(result[0].trend).toBe('up')
    })

    it('maps trend direction to "down" when current revenue < previous', async () => {
      const downTrend = [{ ...mockRawTrends[0], total_revenue: 10000, previous_revenue: 18000 }]
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: downTrend, error: null })

      const result = await service.getPropertyPerformance(mockUserId)

      expect(result[0].trend).toBe('down')
    })

    it('maps trend direction to "stable" when revenues are equal', async () => {
      const stableTrend = [{ ...mockRawTrends[0], total_revenue: 18000, previous_revenue: 18000 }]
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: stableTrend, error: null })

      const result = await service.getPropertyPerformance(mockUserId)

      expect(result[0].trend).toBe('stable')
    })

    it('throws InternalServerErrorException when properties RPC fails', async () => {
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } })
        .mockResolvedValueOnce({ data: mockRawTrends, error: null })

      await expect(service.getPropertyPerformance(mockUserId)).rejects.toThrow(
        InternalServerErrorException
      )
    })

    it('throws InternalServerErrorException when trends RPC fails', async () => {
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Trends RPC failed' } })

      await expect(service.getPropertyPerformance(mockUserId)).rejects.toThrow(
        InternalServerErrorException
      )
    })

    it('uses trendPercentage from trends data', async () => {
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: mockRawTrends, error: null })

      const result = await service.getPropertyPerformance(mockUserId)

      expect(result[0].trendPercentage).toBe(5.88)
    })

    it('defaults to trendPercentage 0 when property not in trends map', async () => {
      const unrelatedTrends = [{ ...mockRawTrends[0], property_id: 'different-prop' }]
      mockSupabaseRpc
        .mockResolvedValueOnce({ data: mockRawProperties, error: null })
        .mockResolvedValueOnce({ data: unrelatedTrends, error: null })

      const result = await service.getPropertyPerformance(mockUserId)

      expect(result[0].trendPercentage).toBe(0)
    })
  })

  // ================================================================
  // getOccupancyTrends
  // ================================================================
  describe('getOccupancyTrends', () => {
    it('calls the get_occupancy_trends_optimized RPC', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockOccupancyRaw, error: null })
      await service.getOccupancyTrends(mockUserId, mockToken)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_occupancy_trends_optimized',
        expect.objectContaining({ p_user_id: mockUserId, p_months: 12 }),
        expect.any(Object)
      )
    })

    it('returns normalized occupancy trend data', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockOccupancyRaw, error: null })
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        month: '2024-01',
        occupancy_rate: 85,
        total_units: 20,
        occupied_units: 17
      })
    })

    it('accepts custom months parameter', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockOccupancyRaw, error: null })
      await service.getOccupancyTrends(mockUserId, mockToken, 6)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_occupancy_trends_optimized',
        expect.objectContaining({ p_months: 6 }),
        expect.any(Object)
      )
    })

    it('returns empty array when RPC returns null or empty', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('returns empty array when RPC returns empty array', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: [], error: null })
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('returns empty array when RPC throws', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('RPC error'))
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('defaults to 0 for missing fields in normalized data', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [{ period: '2024-01' }],
        error: null
      })
      const result = await service.getOccupancyTrends(mockUserId, mockToken)
      if (result.length > 0) {
        expect(result[0].occupancy_rate).toBe(0)
        expect(result[0].total_units).toBe(0)
      }
    })
  })

  // ================================================================
  // getRevenueTrends
  // ================================================================
  describe('getRevenueTrends', () => {
    it('calls the get_revenue_trends_optimized RPC', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockRevenueRaw, error: null })
      await service.getRevenueTrends(mockUserId, mockToken)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_revenue_trends_optimized',
        expect.objectContaining({ p_user_id: mockUserId, p_months: 12 }),
        expect.any(Object)
      )
    })

    it('returns normalized revenue trend data', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockRevenueRaw, error: null })
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        month: '2024-01',
        revenue: 17000,
        growth: 5
      })
    })

    it('parses string revenue values to numbers', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockRevenueRaw, error: null })
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(typeof result[1].revenue).toBe('number')
      expect(result[1].revenue).toBe(18000)
    })

    it('accepts custom months parameter', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockRevenueRaw, error: null })
      await service.getRevenueTrends(mockUserId, mockToken, 3)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_revenue_trends_optimized',
        expect.objectContaining({ p_months: 3 }),
        expect.any(Object)
      )
    })

    it('returns empty array when RPC returns null', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('returns empty array when RPC returns empty array', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: [], error: null })
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('returns empty array when RPC throws', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('RPC error'))
      const result = await service.getRevenueTrends(mockUserId, mockToken)
      expect(result).toEqual([])
    })
  })

  // ================================================================
  // getMaintenanceAnalytics
  // ================================================================
  describe('getMaintenanceAnalytics', () => {
    it('calls the get_maintenance_analytics RPC with correct user_id param', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockMaintenanceRaw, error: null })
      await service.getMaintenanceAnalytics(mockUserId)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_maintenance_analytics',
        expect.objectContaining({ user_id: mockUserId }),
        expect.any(Object)
      )
    })

    it('returns maintenance analytics data', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockMaintenanceRaw, error: null })
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(result).toMatchObject({
        avgResolutionTime: 3.5,
        completionRate: 0.85,
        priorityBreakdown: { low: 2, normal: 5, high: 3, urgent: 1 }
      })
    })

    it('returns EMPTY_MAINTENANCE_ANALYTICS when RPC returns error', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(result).toEqual(EMPTY_MAINTENANCE_ANALYTICS)
    })

    it('returns default zero values when RPC throws', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('Network error'))
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(result).toEqual(EMPTY_MAINTENANCE_ANALYTICS)
    })

    it('defaults missing fields to safe values', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: { avgResolutionTime: null, completionRate: null, priorityBreakdown: null, trendsOverTime: null },
        error: null
      })
      const result = await service.getMaintenanceAnalytics(mockUserId)
      expect(result.avgResolutionTime).toBe(0)
      expect(result.completionRate).toBe(0)
      expect(result.priorityBreakdown).toEqual({})
      expect(result.trendsOverTime).toEqual([])
    })
  })

  // ================================================================
  // getBillingInsights
  // ================================================================
  describe('getBillingInsights', () => {
    it('calls the get_billing_insights RPC with correct user_id', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockBillingRaw, error: null })
      await service.getBillingInsights(mockUserId)
      expect(mockSupabaseRpc).toHaveBeenCalledWith(
        'get_billing_insights',
        expect.objectContaining({ p_user_id: mockUserId }),
        expect.any(Object)
      )
    })

    it('returns billing insights data', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: mockBillingRaw, error: null })
      const result = await service.getBillingInsights(mockUserId)
      expect(result).toEqual(mockBillingRaw)
    })

    it('returns default zeros when RPC throws InternalServerErrorException', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })
      const result = await service.getBillingInsights(mockUserId)
      expect(result).toEqual({ totalRevenue: 0, churnRate: 0, mrr: 0 })
    })

    it('returns default zeros when RPC throws network error', async () => {
      mockSupabaseRpc.mockRejectedValue(new Error('Connection failed'))
      const result = await service.getBillingInsights(mockUserId)
      expect(result).toEqual({ totalRevenue: 0, churnRate: 0, mrr: 0 })
    })
  })

  // ================================================================
  // isHealthy
  // ================================================================
  describe('isHealthy', () => {
    it('returns true when DB query succeeds', async () => {
      const qb = createChainBuilder({ data: [{ id: 'prop-1' }], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.isHealthy()
      expect(result).toBe(true)
    })

    it('returns false when DB query returns error', async () => {
      const qb = createChainBuilder({ data: null, error: { message: 'DB down' } })
      mockAdminClient.from.mockReturnValue(qb)
      const result = await service.isHealthy()
      expect(result).toBe(false)
    })

    it('returns false when an unexpected error is thrown', async () => {
      mockAdminClient.from.mockImplementation(() => {
        throw new Error('Connection refused')
      })
      const result = await service.isHealthy()
      expect(result).toBe(false)
    })

    it('queries the properties table', async () => {
      const qb = createChainBuilder({ data: [], error: null })
      mockAdminClient.from.mockReturnValue(qb)
      await service.isHealthy()
      expect(mockAdminClient.from).toHaveBeenCalledWith('properties')
    })
  })
})
