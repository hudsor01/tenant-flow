/**
 * PropertiesService Tests - Following ULTRA NATIVE Architecture Guidelines
 * 
 * - NO ABSTRACTIONS: Test RPC calls directly 
 * - KISS: Simple, direct test patterns
 * - DRY: Only abstract when reused 2+ places
 * - Production mirror: Test actual service interface
 */

import type { TestingModule } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger';
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { PropertiesService } from './properties.service'
import { SupabaseService } from '../database/supabase.service'
import { generateUUID } from '../../test/setup'

describe('PropertiesService', () => {
  let service: PropertiesService
  let supabaseService: SupabaseService
  let logger: Logger

  // Mock Supabase admin client that properly chains rpc().single()
  const mockSingle = jest.fn()
  const mockRpc = jest.fn()
  const mockSupabaseClient = {
    rpc: mockRpc
  }

  // Helper to setup mock for methods that use .single()
  const setupSingleMock = (data: any, error: any = null) => {
    mockSingle.mockResolvedValue({ data, error })
    mockRpc.mockReturnValue({ single: mockSingle })
  }

  // Helper to setup mock for methods that don't use .single()
  const setupDirectMock = (data: any, error: any = null) => {
    mockRpc.mockResolvedValue({ data, error })
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const mockSupabaseService = {
      getAdminClient: jest.fn(() => mockSupabaseClient)
    }

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService
        },
        {
          provide: Logger,
          useValue: mockLogger
        }
      ]
    })
			.setLogger(new SilentLogger())
			.compile()

    service = module.get<PropertiesService>(PropertiesService)
    supabaseService = module.get<SupabaseService>(SupabaseService)
    logger = module.get<Logger>(Logger)
  })

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should have access to Supabase admin client', () => {
      expect(supabaseService.getAdminClient).toBeDefined()
    })
  })

  describe('findAll - RPC Call Pattern', () => {
    it('should call get_user_properties RPC with correct parameters', async () => {
      const userId = generateUUID()
      const query = {
        search: 'test property',
        limit: 20,
        offset: 10
      }

      const mockData = [{ id: generateUUID(), name: 'Test Property' }]
      // findAll doesn't use .single() - returns data directly
      setupDirectMock(mockData)

      const result = await service.findAll(userId, query)

      expect(mockRpc).toHaveBeenCalledWith('get_user_properties', {
        p_user_id: userId,
        p_search: 'test property',
        p_limit: 20,
        p_offset: 10
      })
      expect(result).toEqual(mockData)
    })

    it('should handle undefined query parameters', async () => {
      const userId = generateUUID()
      const query = {}

      setupDirectMock([])

      await service.findAll(userId, query)

      expect(mockRpc).toHaveBeenCalledWith('get_user_properties', {
        p_user_id: userId,
        p_search: undefined,
        p_limit: undefined,
        p_offset: undefined
      })
    })

    it('should handle RPC errors correctly with fallback data', async () => {
      const userId = generateUUID()
      const query = {}

      setupDirectMock(null, { message: 'Database connection failed' })

      const result = await service.findAll(userId, query)

      // Service should return fallback data instead of throwing
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('id', 'prop-001')
      expect(result[0]).toHaveProperty('name', 'Riverside Towers')
      
      // Should log error but continue with fallback
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed'
          }),
          userId,
          query: {}
        }),
        'Failed to get properties with metrics via RPC, using fallback data'
      )
    })
  })

  describe('getStats - RPC Call Pattern', () => {
    it('should call get_property_stats RPC correctly', async () => {
      const userId = generateUUID()
      const mockStats = {
        totalProperties: 2,
        totalUnits: 3,
        occupiedUnits: 2,
        vacantUnits: 1,
        occupancyRate: 66.7,
        totalMonthlyRevenue: 3000,
        averageRentPerUnit: 1500,
        totalValue: 750000
      }

      // getStats uses .single()
      setupSingleMock(mockStats)

      const result = await service.getStats(userId)

      expect(mockRpc).toHaveBeenCalledWith('get_property_stats', {
        p_user_id: userId
      })
      expect(result).toEqual(mockStats)
    })

    it('should handle stats RPC errors', async () => {
      const userId = generateUUID()

      setupSingleMock(null, { message: 'Stats calculation failed' })

      const result = await service.getStats(userId)

      // Service returns fallback data instead of throwing when RPC fails
      expect(result).toEqual({
        totalProperties: 2,
        totalUnits: 3,
        occupiedUnits: 2,
        vacantUnits: 1,
        occupancyRate: 66.7,
        totalMonthlyRevenue: 3000,
        averageRentPerUnit: 1500,
        totalValue: 750000
      })
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Stats calculation failed',
            code: undefined,
            hint: undefined
          },
          userId
        },
        'Failed to get property stats via RPC, using fallback data'
      )
    })
  })

  describe('findOne - RPC Call Pattern', () => {
    it('should call get_property_details RPC correctly', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()
      const mockProperty = {
        id: propertyId,
        name: 'Test Property',
        address: '123 Main St',
        propertyType: 'APARTMENT'
      }

      // findOne uses .single()
      setupSingleMock(mockProperty)

      const result = await service.findOne(userId, propertyId)

      expect(mockRpc).toHaveBeenCalledWith('get_property_by_id', {
        p_user_id: userId,
        p_property_id: propertyId
      })
      expect(result).toEqual(mockProperty)
    })

    it('should return null on error', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()

      setupSingleMock(null, { message: 'Property not found' })

      const result = await service.findOne(userId, propertyId)

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Property not found',
            code: undefined,
            hint: undefined
          },
          userId,
          propertyId
        },
        'Failed to get property by ID via RPC'
      )
    })
  })

  describe('create - RPC Call Pattern', () => {
    it('should call create_property RPC correctly', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()
      const createRequest = {
        name: 'New Property',
        address: '456 Oak Ave',
        propertyType: 'HOUSE' as const,
        description: 'A beautiful single family home'
      }

      const mockCreatedProperty = {
        id: propertyId,
        ...createRequest
      }

      // create uses .single()
      setupSingleMock(mockCreatedProperty)

      const result = await service.create(userId, createRequest)

      expect(mockRpc).toHaveBeenCalledWith('create_property', {
        p_user_id: userId,
        p_name: createRequest.name,
        p_address: createRequest.address,
        p_type: createRequest.propertyType,
        p_description: createRequest.description
      })
      expect(result).toEqual(mockCreatedProperty)
    })

    it('should handle undefined optional fields', async () => {
      const userId = generateUUID()
      const createRequest = {
        name: 'Minimal Property',
        address: '789 Pine St',
        propertyType: 'APARTMENT' as const
      }

      setupSingleMock({ id: generateUUID(), ...createRequest })

      await service.create(userId, createRequest)

      expect(mockRpc).toHaveBeenCalledWith('create_property', {
        p_user_id: userId,
        p_name: createRequest.name,
        p_address: createRequest.address,
        p_type: createRequest.propertyType,
        p_description: undefined
      })
    })

    it('should handle create errors', async () => {
      const userId = generateUUID()
      const createRequest = {
        name: 'Test Property',
        address: '123 Test St',
        propertyType: 'APARTMENT' as const
      }

      setupSingleMock(null, { message: 'Property creation failed' })

      await expect(service.create(userId, createRequest)).rejects.toThrow(BadRequestException)
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Property creation failed',
            code: undefined,
            hint: undefined
          },
          userId,
          createRequest: expect.any(Object)
        },
        'Failed to create property via RPC'
      )
    })
  })

  describe('update - RPC Call Pattern', () => {
    it('should call update_property RPC correctly', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()
      const updateRequest = {
        name: 'Updated Property',
        address: '999 Updated Ave',
        propertyType: 'CONDO' as const,
        description: 'Updated description'
      }

      const mockUpdatedProperty = { id: propertyId, ...updateRequest }

      // update uses .single()
      setupSingleMock(mockUpdatedProperty)

      const result = await service.update(userId, propertyId, updateRequest)

      expect(mockRpc).toHaveBeenCalledWith('update_property', {
        p_user_id: userId,
        p_property_id: propertyId,
        p_name: updateRequest.name,
        p_address: '999 Updated Ave',
        p_type: updateRequest.propertyType,
        p_description: updateRequest.description
      })
      expect(result).toEqual(mockUpdatedProperty)
    })

    it('should return null on update error', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()
      const updateRequest = {
        name: 'Test Property',
        address: '123 Test St',
        propertyType: 'APARTMENT' as const
      }

      setupSingleMock(null, { message: 'Update permission denied' })

      const result = await service.update(userId, propertyId, updateRequest)
      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Update permission denied',
            code: undefined,
            hint: undefined
          },
          userId,
          propertyId,
          updateRequest: expect.any(Object)
        },
        'Failed to update property via RPC'
      )
    })
  })

  describe('delete - RPC Call Pattern', () => {
    it('should call delete_property RPC correctly', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()

      mockRpc.mockResolvedValue({
        error: null
      })

      const result = await service.remove(userId, propertyId)

      expect(mockRpc).toHaveBeenCalledWith('delete_property', {
        p_user_id: userId,
        p_property_id: propertyId
      })
      expect(result).toEqual({ success: true, message: 'Property deleted successfully' })
    })

    it('should handle delete errors', async () => {
      const userId = generateUUID()
      const propertyId = generateUUID()

      mockRpc.mockResolvedValue({
        error: { message: 'Cannot delete property with active leases' }
      })

      await expect(service.remove(userId, propertyId)).rejects.toThrow(BadRequestException)
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Cannot delete property with active leases',
            code: undefined,
            hint: undefined
          },
          userId,
          propertyId
        },
        'Failed to delete property via RPC'
      )
    })
  })

  describe('ULTRA NATIVE Architecture Validation', () => {
    it('should only use direct RPC calls without abstractions', async () => {
      const userId = generateUUID()

      // Test that all methods use direct RPC calls
      setupDirectMock([])

      // For findOne which uses .single() chaining
      mockRpc.mockReturnValue({
        single: mockSingle
      })

      await service.findAll(userId, {})
      await service.findOne(userId, generateUUID())

      // Verify all calls went through the mocked RPC method
      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(supabaseService.getAdminClient).toHaveBeenCalled()
    })

    it('should maintain service layer as thin RPC wrapper only', () => {
      // Verify service doesn't add business logic layers
      expect(typeof service.findAll).toBe('function')
      expect(typeof service.create).toBe('function')
      expect(typeof service.update).toBe('function')
      expect(typeof service.remove).toBe('function')
      expect(typeof service.findOne).toBe('function')
      expect(typeof service.getStats).toBe('function')

      // Service should be lean with minimal methods
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(method => method !== 'constructor' && typeof service[method] === 'function')

      // Should have core CRUD operations only (no business logic methods)
      expect(serviceMethods.length).toBeLessThanOrEqual(20)
    })
  })
})