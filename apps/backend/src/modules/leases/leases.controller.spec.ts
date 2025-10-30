import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { authUser } from '@repo/shared/types/auth';
import type { Lease } from '@repo/shared/types/core';
import { randomUUID } from 'crypto';
import { SilentLogger } from '../../__test__/silent-logger';
import { SupabaseService } from '../../database/supabase.service';
import { CurrentUserProvider } from '../../shared/providers/current-user.provider';
import type { AuthenticatedRequest } from '../../shared/types/express-request.types';
import { createMockEmailService, createMockUser } from '../../test-utils/mocks';
import { EmailService } from '../email/email.service';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';

describe('LeasesController', () => {
  let controller: LeasesController;
  let mockLeasesService: jest.Mocked<LeasesService>;

  const generateUUID = () => randomUUID();

  const createMockRequest = (user?: authUser): AuthenticatedRequest =>
    ({
      user: user ?? createMockUser(),
      headers: {},
      query: {},
      params: {},
      body: {},
    }) as unknown as AuthenticatedRequest;

  const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
    id: generateUUID(),
    tenantId: generateUUID(),
    unitId: generateUUID(),
    propertyId: generateUUID(),
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    monthlyRent: 1500.0,
    rentAmount: 1500.0,
    securityDeposit: 3000.0,
    status: 'ACTIVE',
    terms: 'Standard lease terms',
    gracePeriodDays: null,
    lateFeeAmount: null,
    lateFeePercentage: null,
    lease_document_url: null,
    signature: null,
    signed_at: null,
    stripe_subscription_id: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    mockLeasesService = {
      findAll: jest.fn(),
      getStats: jest.fn(),
      getExpiring: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      renew: jest.fn(),
      terminate: jest.fn(),
      getLeasePerformanceAnalytics: jest.fn(),
      getLeaseDurationAnalytics: jest.fn(),
      getLeaseTurnoverAnalytics: jest.fn(),
      getLeaseRevenueAnalytics: jest.fn(),
    } as unknown as jest.Mocked<LeasesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeasesController],
      providers: [
        {
          provide: LeasesService,
          useValue: mockLeasesService,
        },
        {
          provide: SupabaseService,
          useValue: {
            getUser: jest.fn().mockImplementation((req) => Promise.resolve(req.user)),
          },
        },
        {
          provide: CurrentUserProvider,
          useValue: {
            getUserId: jest.fn().mockResolvedValue('user-123'),
            getUser: jest.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
            getUserEmail: jest.fn().mockResolvedValue('test@example.com'),
            isAuthenticated: jest.fn().mockResolvedValue(true),
            getUserOrNull: jest.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
          },
        },
        {
          provide: EmailService,
          useValue: createMockEmailService(),
        },
      ],
    })
      .setLogger(new SilentLogger())
      .compile();

    controller = module.get<LeasesController>(LeasesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all leases with default pagination', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const mockLeases = [createMockLease(), createMockLease()];
      mockLeasesService.findAll.mockResolvedValue({
        data: mockLeases,
        total: mockLeases.length,
        limit: 10,
        offset: 0,
      });

      const result = await controller.findAll(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        10,
        0,
        'created_at',
        'desc',
      );

      expect(mockLeasesService.findAll).toHaveBeenCalledWith(user.id, {
        tenantId: undefined,
        unitId: undefined,
        propertyId: undefined,
        status: undefined,
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });
      expect(result.data).toEqual(mockLeases);
    });

    it('should return filtered leases with custom parameters', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const tenantId = generateUUID();
      const unitId = generateUUID();
      const propertyId = generateUUID();
      const mockLeases = [createMockLease()];
      mockLeasesService.findAll.mockResolvedValue({
        data: mockLeases,
        total: mockLeases.length,
        limit: 20,
        offset: 10,
      });

      const result = await controller.findAll(
        mockRequest,
        tenantId,
        unitId,
        propertyId,
        'ACTIVE',
        20,
        10,
        'start_date',
        'asc',
      );

      expect(mockLeasesService.findAll).toHaveBeenCalledWith(user.id, {
        tenantId,
        unitId,
        propertyId,
        status: 'ACTIVE',
        limit: 20,
        offset: 10,
        sortBy: 'start_date',
        sortOrder: 'asc',
      });
      expect(result.data).toEqual(mockLeases);
    });

    it('should throw BadRequestException for invalid tenant ID format', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);

      await expect(controller.findAll(mockRequest, 'invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return lease statistics', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const mockStats = {
        totalLeases: 25,
        activeLeases: 20,
        expiredLeases: 3,
        terminatedLeases: 2,
        totalMonthlyRent: 55000,
        averageRent: 2750,
        totalSecurityDeposits: 12000,
        expiringLeases: 5,
      };
      mockLeasesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockRequest);

      expect(mockLeasesService.getStats).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getExpiring', () => {
    it('should return expiring leases with default days', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const mockExpiring = [createMockLease()];
      mockLeasesService.getExpiring.mockResolvedValue(mockExpiring);

      const result = await controller.getExpiring(mockRequest, 30);

      expect(mockLeasesService.getExpiring).toHaveBeenCalledWith(user.id, 30);
      expect(result).toEqual(mockExpiring);
    });
  });

  describe('findOne', () => {
    it('should return lease by ID', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const leaseId = generateUUID();
      const mockLease = createMockLease({ id: leaseId });
      mockLeasesService.findOne.mockResolvedValue(mockLease);

      const result = await controller.findOne(leaseId, mockRequest);

      expect(mockLeasesService.findOne).toHaveBeenCalledWith(user.id, leaseId);
      expect(result).toEqual(mockLease);
    });

    it('should throw NotFoundException when lease not found', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const leaseId = generateUUID();
      mockLeasesService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(leaseId, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create new lease', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const createRequest = {
        tenantId: generateUUID(),
        unitId: generateUUID(),
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        rentAmount: 1500.0,
        securityDeposit: 3000.0,
        status: 'DRAFT' as const,
      };
      const mockLease = createMockLease();
      mockLeasesService.create.mockResolvedValue(mockLease);

      const result = await controller.create(createRequest, mockRequest);

      expect(mockLeasesService.create).toHaveBeenCalledWith(user.id, createRequest);
      expect(result).toEqual(mockLease);
    });
  });

  describe('update', () => {
    it('should update existing lease', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const leaseId = generateUUID();
      const updateRequest = {
        rentAmount: 1600.0,
        securityDeposit: 3200.0,
        status: 'ACTIVE' as const,
      };
      const mockLease = createMockLease({ ...updateRequest });
      mockLeasesService.update.mockResolvedValue(mockLease);

      const result = await controller.update(leaseId, updateRequest, mockRequest);

      expect(mockLeasesService.update).toHaveBeenCalledWith(
        user.id,
        leaseId,
        updateRequest,
        undefined,
      );
      expect(result).toEqual(mockLease);
    });
  });

  describe('remove', () => {
    it('should delete lease', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const leaseId = generateUUID();
      mockLeasesService.remove.mockResolvedValue(undefined);

      await controller.remove(leaseId, mockRequest);

      expect(mockLeasesService.remove).toHaveBeenCalledWith(user.id, leaseId);
    });
  });

  describe('renew', () => {
    it('should renew lease with valid end date', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const leaseId = generateUUID();
      const endDate = '2025-12-31';
      const mockLease = createMockLease({ endDate: endDate });
      mockLeasesService.renew.mockResolvedValue(mockLease);

      const result = await controller.renew(leaseId, endDate, mockRequest);

      expect(mockLeasesService.renew).toHaveBeenCalledWith(user.id, leaseId, endDate);
      expect(result).toEqual(mockLease);
    });
  });

  describe('terminate', () => {
    it('should terminate lease with reason', async () => {
      const user = createMockUser();
      const mockRequest = createMockRequest(user);
      const leaseId = generateUUID();
      const reason = 'Tenant violation';
      const mockLease = createMockLease({ status: 'TERMINATED' });
      mockLeasesService.terminate.mockResolvedValue(mockLease);

      const result = await controller.terminate(
        leaseId,
        mockRequest,
        reason,
      );

      expect(mockLeasesService.terminate).toHaveBeenCalledWith(
        user.id,
        leaseId,
        expect.any(String),
        reason,
      );
      expect(result).toEqual(mockLease);
    });
  });
});
