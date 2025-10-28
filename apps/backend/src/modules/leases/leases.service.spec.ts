import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LeasesService } from './leases.service';
import { TenantsService } from '../tenants/tenants.service';
import { SupabaseService } from '../../database/supabase.service';
import { EmailService } from '../email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('LeasesService', () => {
  let leasesService: LeasesService;
  let tenantsService: TenantsService;

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
    tenantsService = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(leasesService).toBeDefined();
  });

  describe('create', () => {
    it('should create a tenant, a lease, and send an invitation', async () => {
      const createLeaseRequest = {
        unitId: 'unit-id',
        startDate: '2025-01-01',
        endDate: '2026-01-01',
        monthlyRent: 1000,
        securityDeposit: 500,
        tenant: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      const result = await leasesService.create('user-id', createLeaseRequest as any);

      expect(tenantsService.create).toHaveBeenCalledWith('user-id', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(tenantsService.sendTenantInvitationV2).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
        'property-id',
        'lease-id'
      );

      expect(result).toEqual({ id: 'lease-id' });
    });
  });
});
