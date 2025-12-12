import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { TenantPaymentService } from './tenant-payment.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { PaymentStatusService } from './payment-status.service'
import { PaymentHistoryService } from './payment-history.service'


describe('TenantPaymentService', () => {
  let service: TenantPaymentService
  let mockSupabaseService: jest.Mocked<SupabaseService>
  let mockPaymentStatusService: jest.Mocked<PaymentStatusService>
  let mockPaymentHistoryService: jest.Mocked<PaymentHistoryService>

  beforeEach(async () => {
    mockSupabaseService = {
      getAdminClient: jest.fn()
    } as unknown as jest.Mocked<SupabaseService>

    mockPaymentStatusService = {
      calculatePaymentStatus: jest.fn()
    } as unknown as jest.Mocked<PaymentStatusService>

    mockPaymentHistoryService = {
      getTenantPaymentHistory: jest.fn(),
      getTenantPaymentHistoryForTenant: jest.fn(),
      getOwnerPaymentSummary: jest.fn(),
      queryTenantPayments: jest.fn(),
      mapPaymentIntentToRecord: jest.fn(),
      ensureTenantOwnedByUser: jest.fn()
    } as unknown as jest.Mocked<PaymentHistoryService>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantPaymentService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: AppLogger, useValue: new SilentLogger() },
        { provide: PaymentStatusService, useValue: mockPaymentStatusService },
        { provide: PaymentHistoryService, useValue: mockPaymentHistoryService }
      ]
    }).compile()

    service = module.get<TenantPaymentService>(TenantPaymentService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('calculatePaymentStatus', () => {
    it('should delegate to PaymentStatusService', async () => {
      const mockResult = {
        status: 'succeeded' as const,
        amount_due: 0,
        late_fees: 0,
        last_payment: '2025-01-15T00:00:00Z'
      }
      mockPaymentStatusService.calculatePaymentStatus.mockResolvedValue(mockResult)

      const result = await service.calculatePaymentStatus('tenant-1')

      expect(mockPaymentStatusService.calculatePaymentStatus).toHaveBeenCalledWith('tenant-1')
      expect(result).toEqual(mockResult)
    })

    it('should return NO_PAYMENTS status when delegated service returns it', async () => {
      const mockResult = {
        status: 'NO_PAYMENTS' as const,
        amount_due: 0,
        late_fees: 0
      }
      mockPaymentStatusService.calculatePaymentStatus.mockResolvedValue(mockResult)

      const result = await service.calculatePaymentStatus('tenant-1')

      expect(result).toEqual(mockResult)
    })
  })

  describe('getOwnerPaymentSummary', () => {
    it('should delegate to PaymentHistoryService', async () => {
      const mockResult = {
        lateFeeTotal: 5000,
        unpaidTotal: 100000,
        unpaidCount: 2,
        tenantCount: 3
      }
      mockPaymentHistoryService.getOwnerPaymentSummary.mockResolvedValue(mockResult)

      const result = await service.getOwnerPaymentSummary('owner-1')

      expect(mockPaymentHistoryService.getOwnerPaymentSummary).toHaveBeenCalledWith('owner-1', 50)
      expect(result).toEqual(mockResult)
    })

    it('should pass custom limit to PaymentHistoryService', async () => {
      const mockResult = {
        lateFeeTotal: 0,
        unpaidTotal: 0,
        unpaidCount: 0,
        tenantCount: 0
      }
      mockPaymentHistoryService.getOwnerPaymentSummary.mockResolvedValue(mockResult)

      await service.getOwnerPaymentSummary('owner-1', 100)

      expect(mockPaymentHistoryService.getOwnerPaymentSummary).toHaveBeenCalledWith('owner-1', 100)
    })
  })

  describe('getTenantPaymentHistory', () => {
    it('should delegate to PaymentHistoryService', async () => {
      const mockResult = {
        payments: [
          {
            id: 'pi_1',
            amount: 100000,
            status: 'succeeded' as const,
            date: '2025-01-15T00:00:00Z',
            tenantId: 'tenant-1'
          }
        ]
      }
      mockPaymentHistoryService.getTenantPaymentHistory.mockResolvedValue(mockResult)

      const result = await service.getTenantPaymentHistory('user-1', 'tenant-1')

      expect(mockPaymentHistoryService.getTenantPaymentHistory).toHaveBeenCalledWith('user-1', 'tenant-1', 20)
      expect(result).toEqual(mockResult)
    })

    it('should pass custom limit to PaymentHistoryService', async () => {
      const mockResult = { payments: [] }
      mockPaymentHistoryService.getTenantPaymentHistory.mockResolvedValue(mockResult)

      await service.getTenantPaymentHistory('user-1', 'tenant-1', 50)

      expect(mockPaymentHistoryService.getTenantPaymentHistory).toHaveBeenCalledWith('user-1', 'tenant-1', 50)
    })
  })

  describe('getTenantPaymentHistoryForTenant', () => {
    it('should delegate to PaymentHistoryService', async () => {
      const mockResult = {
        payments: [
          {
            id: 'pi_1',
            amount: 100000,
            status: 'succeeded' as const,
            date: '2025-01-15T00:00:00Z',
            tenantId: 'tenant-1'
          }
        ]
      }
      mockPaymentHistoryService.getTenantPaymentHistoryForTenant.mockResolvedValue(mockResult)

      const result = await service.getTenantPaymentHistoryForTenant('auth-user-1')

      expect(mockPaymentHistoryService.getTenantPaymentHistoryForTenant).toHaveBeenCalledWith('auth-user-1', 20)
      expect(result).toEqual(mockResult)
    })

    it('should pass custom limit to PaymentHistoryService', async () => {
      const mockResult = { payments: [] }
      mockPaymentHistoryService.getTenantPaymentHistoryForTenant.mockResolvedValue(mockResult)

      await service.getTenantPaymentHistoryForTenant('auth-user-1', 100)

      expect(mockPaymentHistoryService.getTenantPaymentHistoryForTenant).toHaveBeenCalledWith('auth-user-1', 100)
    })
  })
})
