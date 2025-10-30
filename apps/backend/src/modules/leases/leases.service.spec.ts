import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LeasesService } from './leases.service';
import { TenantsService } from '../tenants/tenants.service';
import { SupabaseService } from '../../database/supabase.service';
import { EmailService } from '../email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('LeasesService', () => {
  let leasesService: LeasesService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(() => ({
      from: jest.fn((table: string) => {
        if (table === 'unit') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: { propertyId: 'property-id' }, error: null })),
              })),
            })),
          };
        }
        if (table === 'property') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: { id: 'property-id', ownerId: 'user-id' }, error: null })),
              })),
            })),
          };
        }
        if (table === 'tenant') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => ({ data: { id: 'tenant-id' }, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === 'lease') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({ data: { id: 'lease-id' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: {}, error: null })),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({ data: {}, error: null })),
            })),
          })),
        };
      }),
    })),
  };

  const mockTenantsService = {
    create: jest.fn(() => Promise.resolve({ id: 'tenant-id', email: 'test@example.com' })),
    sendTenantInvitation: jest.fn(() => Promise.resolve({ success: true })),
    sendTenantInvitationV2: jest.fn(() => Promise.resolve({ success: true })),
  };

  const mockEmailService = {
    sendTenantInvitation: jest.fn(() => Promise.resolve()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasesService,
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: EmailService, useValue: mockEmailService },
        EventEmitter2,
      ],
    }).compile();

    leasesService = module.get<LeasesService>(LeasesService);
  });

  it('should be defined', () => {
    expect(leasesService).toBeDefined();
  });

  describe('create', () => {
    it('should create a lease with existing tenant', async () => {
      const createLeaseDto = {
        unitId: 'unit-id',
        tenantId: 'tenant-id',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        rentAmount: 1000,
        securityDeposit: 500,
        status: 'DRAFT' as const
      };

      const result = await leasesService.create('user-id', createLeaseDto as any);

      expect(result).toEqual({ id: 'lease-id' });
    });
  });
});
