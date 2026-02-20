import { Test } from '@nestjs/testing'
import { DashboardPerformanceService } from './dashboard-performance.service'
import { DashboardAnalyticsService } from '../analytics/dashboard-analytics.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import type { PropertyPerformance } from '@repo/shared/types/core'

describe('DashboardPerformanceService', () => {
  let service: DashboardPerformanceService
  let mockAnalyticsService: jest.Mocked<Pick<DashboardAnalyticsService, 'getPropertyPerformance'>>

  const mockUserId = 'user-perf-123'
  const mockToken = 'mock-jwt-token'

  const mockPropertyPerformance: PropertyPerformance[] = [
    {
      property: 'Sunset Apartments',
      property_id: 'prop-sunset-1',
      address_line1: '100 Sunset Blvd',
      totalUnits: 20,
      occupiedUnits: 18,
      vacantUnits: 2,
      occupancyRate: 90,
      revenue: 216000,
      monthlyRevenue: 18000,
      potentialRevenue: 240000,
      property_type: 'apartment',
      status: 'PARTIAL',
      trend: 'up',
      trendPercentage: 12
    },
    {
      property: 'Downtown Lofts',
      property_id: 'prop-downtown-2',
      address_line1: '200 Main Ave',
      totalUnits: 10,
      occupiedUnits: 5,
      vacantUnits: 5,
      occupancyRate: 50,
      revenue: 60000,
      monthlyRevenue: 5000,
      potentialRevenue: 120000,
      property_type: 'condo',
      status: 'PARTIAL',
      trend: 'down',
      trendPercentage: -8
    }
  ]

  beforeEach(async () => {
    mockAnalyticsService = {
      getPropertyPerformance: jest.fn().mockResolvedValue(mockPropertyPerformance)
    } as jest.Mocked<Pick<DashboardAnalyticsService, 'getPropertyPerformance'>>

    const module = await Test.createTestingModule({
      providers: [
        DashboardPerformanceService,
        { provide: DashboardAnalyticsService, useValue: mockAnalyticsService },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    })
      .setLogger(new SilentLogger())
      .compile()

    service = module.get<DashboardPerformanceService>(DashboardPerformanceService)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  // ================================================================
  // getPropertyPerformance
  // ================================================================
  describe('getPropertyPerformance', () => {
    it('returns property performance data from analytics service', async () => {
      const result = await service.getPropertyPerformance(mockUserId, mockToken)
      expect(result).toEqual(mockPropertyPerformance)
      expect(mockAnalyticsService.getPropertyPerformance).toHaveBeenCalledWith(
        mockUserId,
        mockToken
      )
    })

    it('returns empty array when user_id is not provided', async () => {
      const result = await service.getPropertyPerformance(undefined, mockToken)
      expect(result).toEqual([])
      expect(mockAnalyticsService.getPropertyPerformance).not.toHaveBeenCalled()
    })

    it('returns empty array when analytics service throws', async () => {
      mockAnalyticsService.getPropertyPerformance.mockRejectedValue(
        new Error('RPC failure')
      )
      const result = await service.getPropertyPerformance(mockUserId, mockToken)
      expect(result).toEqual([])
    })

    it('passes user_id and token correctly to analytics service', async () => {
      const specificUserId = 'specific-user-xyz'
      const specificToken = 'specific-token-abc'
      await service.getPropertyPerformance(specificUserId, specificToken)
      expect(mockAnalyticsService.getPropertyPerformance).toHaveBeenCalledWith(
        specificUserId,
        specificToken
      )
    })

    it('works without optional token parameter', async () => {
      const result = await service.getPropertyPerformance(mockUserId)
      expect(result).toEqual(mockPropertyPerformance)
      expect(mockAnalyticsService.getPropertyPerformance).toHaveBeenCalledWith(
        mockUserId,
        undefined
      )
    })

    it('returns all performance properties from analytics service', async () => {
      const result = await service.getPropertyPerformance(mockUserId, mockToken)
      expect(result).toHaveLength(2)
    })

    it('returns empty array on unexpected error variant', async () => {
      mockAnalyticsService.getPropertyPerformance.mockRejectedValue(
        new TypeError('Cannot read properties of undefined')
      )
      const result = await service.getPropertyPerformance(mockUserId)
      expect(result).toEqual([])
    })

    it('delegates directly to analytics service without transformation', async () => {
      const specificData: PropertyPerformance[] = [
        {
          property: 'Test Property',
          property_id: 'prop-test',
          address_line1: '1 Test St',
          totalUnits: 5,
          occupiedUnits: 5,
          vacantUnits: 0,
          occupancyRate: 100,
          revenue: 60000,
          monthlyRevenue: 5000,
          potentialRevenue: 60000,
          property_type: 'house',
          status: 'FULL',
          trend: 'stable',
          trendPercentage: 0
        }
      ]
      mockAnalyticsService.getPropertyPerformance.mockResolvedValue(specificData)
      const result = await service.getPropertyPerformance(mockUserId, mockToken)
      expect(result).toBe(specificData)
    })
  })
})
