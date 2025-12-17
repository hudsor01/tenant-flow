import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { LeasesService } from './leases.service'
import { SupabaseService } from '../../database/supabase.service'
import { EmailService } from '../email/email.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ZeroCacheService } from '../../cache/cache.service'
import type { Lease } from '@repo/shared/types/core'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'


describe('LeasesService', () => {
  let service: LeasesService
  let mockUserClient: any
  let mockSupabaseService: any

  const mockToken = 'mock-jwt-token'

  const createMockLease = (overrides: Partial<Lease> = {}): Lease => ({
    id: 'lease-123',
    unit_id: 'unit-456',
    primary_tenant_id: 'tenant-789',
    start_date: '2025-01-01',
    end_date: '2026-01-01',
    rent_amount: 150000, // $1500 in cents
    security_deposit: 150000,
    lease_status: 'active',
    payment_day: 1,
    rent_currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  })

  beforeEach(async () => {
    // Create a flexible mock client
    mockUserClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    }

    mockSupabaseService = {
      getUserClient: jest.fn().mockReturnValue(mockUserClient),
      getAdminClient: jest.fn().mockReturnValue(mockUserClient)
    }

    const mockEmailService = {
      sendPaymentSuccessEmail: jest.fn(),
      sendPaymentFailedEmail: jest.fn(),
      sendSubscriptionCanceledEmail: jest.fn()
    }

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn().mockReturnValue(0),
      invalidateByEntity: jest.fn().mockReturnValue(0),
      invalidateByUser: jest.fn().mockReturnValue(0)
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasesService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ZeroCacheService, useValue: mockCacheService },
        { provide: EmailService, useValue: mockEmailService },
        EventEmitter2,
        {
          provide: AppLogger,
          useValue: new SilentLogger()
        }
      ]
    }).compile()

    service = module.get<LeasesService>(LeasesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const validCreateDto = {
      unit_id: 'unit-456',
      primary_tenant_id: 'tenant-789',
      start_date: '2025-01-01',
      end_date: '2026-01-01',
      rent_amount: 150000,
      security_deposit: 150000,
      lease_status: 'pending' as const
    }

    it('should create a lease successfully', async () => {
      const mockLease = createMockLease()

      // Mock unit lookup
      mockUserClient.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { 
                  id: 'unit-456', 
                  property_id: 'prop-123',
                  property: { name: 'Test Property', owner_user_id: 'owner-123' }
                },
                error: null
              })
            })
          }
        }
        if (table === 'tenants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'tenant-789',
                  user_id: 'user-123',
                  user: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
                },
                error: null
              })
            })
          }
        }
        if (table === 'tenant_invitations') {
          const invitationChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 'invitation-123' },
                error: null
              })
            })
          }
          // Make eq() return the chain object so .not() is available
          invitationChain.eq = jest.fn().mockReturnValue(invitationChain)
          invitationChain.select = jest.fn().mockReturnValue(invitationChain)
          return invitationChain
        }
        if (table === 'leases') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLease,
                  error: null
                })
              })
            })
          }
        }
        return mockUserClient
      })

      const result = await service.create(mockToken, validCreateDto as any)

      expect(result).toEqual(mockLease)
    })

    it('should throw BadRequestException when token is missing', async () => {
      await expect(service.create('', validCreateDto as any)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException when unit_id is missing', async () => {
      const invalidDto = { ...validCreateDto, unit_id: '' }

      await expect(service.create(mockToken, invalidDto as any)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException when primary_tenant_id is missing', async () => {
      const invalidDto = { ...validCreateDto, primary_tenant_id: '' }

      await expect(service.create(mockToken, invalidDto as any)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException when unit not found', async () => {
      mockUserClient.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          }
        }
        return mockUserClient
      })

      await expect(service.create(mockToken, validCreateDto as any)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException when tenant not found', async () => {
      mockUserClient.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'unit-456' },
                error: null
              })
            })
          }
        }
        if (table === 'tenants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          }
        }
        return mockUserClient
      })

      await expect(service.create(mockToken, validCreateDto as any)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException when tenant is not invited to property', async () => {
      // Mock unit lookup - succeeds
      // Mock tenant lookup - succeeds
      // Mock invitation lookup - fails (returns null)
      mockUserClient.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'unit-456',
                  property_id: 'prop-123',
                  property: { name: 'Test Property' }
                },
                error: null
              })
            })
          }
        }
        if (table === 'tenants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'tenant-789',
                  user_id: 'user-123',
                  user: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
                },
                error: null
              })
            })
          }
        }
        if (table === 'tenant_invitations') {
          // NO INVITATION FOUND - This should trigger the validation error
          const invitationChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null, // No invitation found
                error: null
              })
            })
          }
          invitationChain.eq = jest.fn().mockReturnValue(invitationChain)
          invitationChain.select = jest.fn().mockReturnValue(invitationChain)
          return invitationChain
        }
        return mockUserClient
      })

      await expect(service.create(mockToken, validCreateDto as any)).rejects.toThrow(
        new BadRequestException(
          'Cannot create lease: John Doe has not been invited to Test Property. Please send an invitation first.'
        )
      )
    })

    it('should throw BadRequestException on database insert error', async () => {
      mockUserClient.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'unit-456' },
                error: null
              })
            })
          }
        }
        if (table === 'tenants') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'tenant-789' },
                error: null
              })
            })
          }
        }
        if (table === 'leases') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Insert failed' }
                })
              })
            })
          }
        }
        return mockUserClient
      })

      await expect(service.create(mockToken, validCreateDto as any)).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('findAll', () => {
    it('should return paginated leases', async () => {
      const mockLeases = [createMockLease(), createMockLease({ id: 'lease-456' })]

      // Mock single query with count: 'exact'
      // The implementation uses .select('*', { count: 'exact' }) which returns both data and count
      mockUserClient.from.mockImplementation(() => {
        const builder: Record<string, jest.Mock> = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockLeases,
            count: 2,
            error: null
          })
        }

        return builder
      })

      const result = await service.findAll(mockToken, { limit: 10, offset: 0 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(0)
    })

    it('should throw BadRequestException when token is missing', async () => {
      await expect(service.findAll('', {})).rejects.toThrow(BadRequestException)
    })

    it('should apply property_id filter', async () => {
      const mockLeases = [createMockLease()]

      mockUserClient.from.mockImplementation(() => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockLeases,
            error: null,
            count: 1
          })
        }
        return builder
      })

      const result = await service.findAll(mockToken, {
        property_id: 'prop-123',
        limit: 10,
        offset: 0
      })

      expect(result.data).toHaveLength(1)
    })

    it('should apply status filter', async () => {
      const mockLeases = [createMockLease({ lease_status: 'active' })]

      mockUserClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockLeases,
          error: null,
          count: 1
        })
      }))

      const result = await service.findAll(mockToken, {
        status: 'active',
        limit: 10,
        offset: 0
      })

      expect(result.data).toHaveLength(1)
    })

    it('should apply date range filters', async () => {
      mockUserClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      }))

      const result = await service.findAll(mockToken, {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        limit: 10,
        offset: 0
      })

      expect(result.data).toHaveLength(0)
    })

    it('should throw BadRequestException on count error', async () => {
      mockUserClient.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Count failed' }
        })
      }))

      await expect(service.findAll(mockToken, {})).rejects.toThrow(BadRequestException)
    })
  })

  describe('findOne', () => {
    it('should return a lease when found', async () => {
      const mockLease = createMockLease()

      mockUserClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockLease,
            error: null
          })
        })
      }))

      const result = await service.findOne(mockToken, 'lease-123')

      expect(result).toEqual(mockLease)
    })

    // FAIL FAST: Missing token should throw immediately, not return null
    it('should throw BadRequestException when token is missing', async () => {
      await expect(service.findOne('', 'lease-123')).rejects.toThrow(
        BadRequestException
      )
    })

    // FAIL FAST: Missing lease_id should throw immediately, not return null
    it('should throw BadRequestException when lease_id is missing', async () => {
      await expect(service.findOne(mockToken, '')).rejects.toThrow(
        BadRequestException
      )
    })

    // FAIL FAST: Not found should throw NotFoundException, not return null
    it('should throw NotFoundException when lease not found', async () => {
      mockUserClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }))

      await expect(service.findOne(mockToken, 'nonexistent')).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException on database error', async () => {
      mockUserClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      }))

      await expect(service.findOne(mockToken, 'lease-123')).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('update', () => {
    const validUpdateDto = {
      rent_amount: 175000,
      lease_status: 'active' as const
    }

    it('should update a lease successfully', async () => {
      const existingLease = createMockLease()
      const updatedLease = createMockLease({ rent_amount: 175000 })

      // Mock findOne
      jest.spyOn(service, 'findOne').mockResolvedValue(existingLease)

      mockUserClient.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedLease,
              error: null
            })
          })
        })
      }))

      const result = await service.update(mockToken, 'lease-123', validUpdateDto as any)

      expect(result.rent_amount).toBe(175000)
    })

    // FAIL FAST: Missing token should throw immediately, not return null
    it('should throw BadRequestException when token is missing', async () => {
      await expect(
        service.update('', 'lease-123', validUpdateDto as any)
      ).rejects.toThrow(BadRequestException)
    })

    // FAIL FAST: Missing lease_id should throw immediately, not return null
    it('should throw BadRequestException when lease_id is missing', async () => {
      await expect(
        service.update(mockToken, '', validUpdateDto as any)
      ).rejects.toThrow(BadRequestException)
    })

    // Lease not found should throw NotFoundException (via findOne)
    it('should throw NotFoundException when lease not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(
        new NotFoundException('Lease not found')
      )

      await expect(
        service.update(mockToken, 'nonexistent', validUpdateDto as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException on database update error', async () => {
      const existingLease = createMockLease()
      jest.spyOn(service, 'findOne').mockResolvedValue(existingLease)

      mockUserClient.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed' }
            })
          })
        })
      }))

      await expect(
        service.update(mockToken, 'lease-123', validUpdateDto as any)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('remove', () => {
    it('should delete a lease successfully', async () => {
      const existingLease = createMockLease()
      jest.spyOn(service, 'findOne').mockResolvedValue(existingLease)

      mockUserClient.from.mockImplementation(() => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      }))

      // remove() returns void on success
      await expect(service.remove(mockToken, 'lease-123')).resolves.toBeUndefined()
    })

    it('should throw BadRequestException when token is missing', async () => {
      await expect(service.remove('', 'lease-123')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException when lease_id is missing', async () => {
      await expect(service.remove(mockToken, '')).rejects.toThrow(BadRequestException)
    })

    // Lease not found should throw NotFoundException (via findOne)
    it('should throw NotFoundException when lease not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(
        new NotFoundException('Lease not found')
      )

      await expect(service.remove(mockToken, 'nonexistent')).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException on database delete error', async () => {
      const existingLease = createMockLease()
      jest.spyOn(service, 'findOne').mockResolvedValue(existingLease)

      mockUserClient.from.mockImplementation(() => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Delete failed' }
        })
      }))

      await expect(service.remove(mockToken, 'lease-123')).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('query optimization', () => {
    it('should use single query with count: exact', async () => {
      const mockLeases = [createMockLease(), createMockLease({ id: 'lease-456' })]

      // Mock the Supabase client to track query calls
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockLeases,
          count: 2,
          error: null
        })
      })

      mockUserClient.from = mockFrom

      const result = await service.findAll(mockToken, { limit: 10, offset: 0 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })
  })
})
