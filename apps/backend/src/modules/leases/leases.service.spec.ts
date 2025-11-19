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
    getUserClient: jest.fn((_token: string) => ({
      from: jest.fn((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'unit-id', property_id: 'property-id' }, error: null })),
              })),
            })),
          };
        }
        if (table === 'properties') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'property-id', owner_id: 'user-id' }, error: null })),
              })),
            })),
          };
        }
	        if (table === 'tenants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'tenant-id' }, error: null })),
              })),
            })),
          };
        }
        if (table === 'leases') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'lease-id' }, error: null })),
              })),
            })),
          };
        }
        return {};
      }),
    })),
    getAdminClient: jest.fn(() => ({
      from: jest.fn((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'unit-id', property_id: 'property-id' }, error: null })),
              })),
            })),
          };
        }
        if (table === 'properties') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'property-id', owner_id: 'user-id' }, error: null })),
              })),
            })),
          };
        }
	        if (table === 'tenants') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'tenant-id' }, error: null })),
              })),
            })),
          };
        }
        if (table === 'leases') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'lease-id' }, error: null })),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
            })),
          })),
        };
      }),
    })),
  };

  const mockTenantsService = {
    create: jest.fn(() => Promise.resolve({ id: 'tenant-id', email: 'test@example.com' })),
    sendTenantInvitationV2: jest.fn(() => Promise.resolve({ success: true })),
  };

  const mockEmailService = {
    sendPaymentSuccessEmail: jest.fn(() => Promise.resolve()),
    sendPaymentFailedEmail: jest.fn(() => Promise.resolve()),
    sendSubscriptionCanceledEmail: jest.fn(() => Promise.resolve()),
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
        unit_id: 'unit-id',
        primary_tenant_id: 'tenant-id',
        start_date: '2025-01-01',
        end_date: '2026-01-01',
        rent_amount: 1000,
        security_deposit: 500,
        status: 'DRAFT' as const
      };

      const result = await leasesService.create('mock-jwt-token', createLeaseDto as any);

      expect(result).toEqual({ id: 'lease-id' });
    });
  });
});
