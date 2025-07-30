import { Test, TestingModule } from '@nestjs/testing'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { PrismaService } from '../prisma/prisma.service'
import { PropertyType } from '@prisma/client'
import { NotFoundException, ValidationException } from '../common/exceptions/base.exception'
import { vi, Mock } from 'vitest'

describe('PropertiesService', () => {
  let service: PropertiesService
  let repository: any
  let errorHandler: any
  let prisma: any

  beforeEach(async () => {
    // Create mocks
    repository = {
      findPropertyById: vi.fn(),
      findPropertiesByOwner: vi.fn(),
      findByOwnerWithUnits: vi.fn(),
      findByIdAndOwner: vi.fn(),
      createProperty: vi.fn(),
      updateProperty: vi.fn(),
      deleteProperty: vi.fn(),
      getPropertyStats: vi.fn(),
      getStatsByOwner: vi.fn(),
      prismaClient: vi.fn(),
      model: vi.fn(),
      exists: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
      findMany: vi.fn(),
      findOne: vi.fn(),
      parseQueryParams: vi.fn()
    }
    
    errorHandler = {
      handleError: vi.fn(),
      handleErrorEnhanced: vi.fn(),
      logBusinessError: vi.fn(),
      logNotFoundError: vi.fn(),
      logValidationError: vi.fn()
    }
    
    prisma = {
      property: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
      },
      unit: {
        findMany: vi.fn(),
        create: vi.fn()
      },
      $transaction: vi.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PropertiesRepository,
          useValue: repository,
        },
        {
          provide: ErrorHandlerService,
          useValue: errorHandler,
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile()

    service = module.get<PropertiesService>(PropertiesService)
    repository = module.get<PropertiesRepository>(PropertiesRepository)
    
    // Manually inject the repository dependency due to Vitest DI issues
    ;(service as any).propertiesRepository = repository
    ;(service as any).errorHandler = errorHandler
    
    // Setup repository to expose prismaClient
    repository.prismaClient = prisma
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Initialization', () => {
    it('should have repository injected correctly', () => {
      expect(service).toBeDefined()
      expect((service as any).propertiesRepository).toBeDefined()
    })
  })

  describe('getPropertiesByOwner', () => {
    const ownerId = 'test-owner-id'
    const mockProperties = [
      {
        id: 'prop-1',
        name: 'Property 1',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        ownerId,
        propertyType: PropertyType.SINGLE_FAMILY,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'prop-2',
        name: 'Property 2',
        address: '456 Oak Ave',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
        ownerId,
        propertyType: PropertyType.APARTMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should return properties for a valid owner', async () => {
      repository.findByOwnerWithUnits.mockResolvedValue(mockProperties)

      const result = await service.getPropertiesByOwner(ownerId)

      expect(repository.findByOwnerWithUnits).toHaveBeenCalledWith(ownerId, {
        propertyType: undefined,
        search: undefined,
        limit: undefined,
        offset: undefined,
      })
      expect(result).toEqual(mockProperties)
    })

    it('should throw ValidationException if ownerId is not provided', async () => {
      await expect(service.getPropertiesByOwner('')).rejects.toThrow(ValidationException)
      await expect(service.getPropertiesByOwner('')).rejects.toThrow('Owner ID is required')
    })

    it('should apply query filters correctly', async () => {
      const query = {
        propertyType: PropertyType.APARTMENT,
        search: 'Dallas',
        limit: '10',
        offset: '0',
      }

      repository.findByOwnerWithUnits.mockResolvedValue([mockProperties[1]])

      const result = await service.getPropertiesByOwner(ownerId, query)

      expect(repository.findByOwnerWithUnits).toHaveBeenCalledWith(ownerId, {
        propertyType: PropertyType.APARTMENT,
        search: 'Dallas',
        limit: 10,
        offset: 0,
      })
      expect(result).toHaveLength(1)
      expect(result[0].propertyType).toBe(PropertyType.APARTMENT)
    })

    it('should validate limit parameter', async () => {
      const query = { limit: '1001' }

      await expect(service.getPropertiesByOwner(ownerId, query)).rejects.toThrow(ValidationException)
      await expect(service.getPropertiesByOwner(ownerId, query)).rejects.toThrow('Limit must be between 0 and 1000')
    })

    it('should validate offset parameter', async () => {
      const query = { offset: '-1' }

      await expect(service.getPropertiesByOwner(ownerId, query)).rejects.toThrow(ValidationException)
      await expect(service.getPropertiesByOwner(ownerId, query)).rejects.toThrow('Offset must be non-negative')
    })
  })

  describe('getPropertyById', () => {
    const propertyId = 'test-property-id'
    const ownerId = 'test-owner-id'
    const mockProperty = {
      id: propertyId,
      name: 'Test Property',
      address: '123 Test St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      ownerId,
      propertyType: PropertyType.SINGLE_FAMILY,
      units: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return property when found', async () => {
      repository.findByIdAndOwner.mockResolvedValue(mockProperty)

      const result = await service.getPropertyById(propertyId, ownerId)

      expect(repository.findByIdAndOwner).toHaveBeenCalledWith(propertyId, ownerId, true)
      expect(result).toEqual(mockProperty)
    })

    it('should throw NotFoundException when property not found', async () => {
      repository.findByIdAndOwner.mockResolvedValue(null)

      await expect(service.getPropertyById(propertyId, ownerId)).rejects.toThrow(NotFoundException)
      await expect(service.getPropertyById(propertyId, ownerId)).rejects.toThrow('Property')
    })

    it('should throw ValidationException when id is missing', async () => {
      await expect(service.getPropertyById('', ownerId)).rejects.toThrow(ValidationException)
      await expect(service.getPropertyById('', ownerId)).rejects.toThrow('Property ID is required')
    })

    it('should throw ValidationException when ownerId is missing', async () => {
      await expect(service.getPropertyById(propertyId, '')).rejects.toThrow(ValidationException)
      await expect(service.getPropertyById(propertyId, '')).rejects.toThrow('Owner ID is required')
    })
  })

  describe('createProperty', () => {
    const ownerId = 'test-owner-id'
    const propertyData = {
      name: 'New Property',
      address: '789 New St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      description: 'A nice property',
      propertyType: PropertyType.SINGLE_FAMILY,
    }

    it('should create property successfully', async () => {
      const mockCreatedProperty = { id: 'new-prop-id', ...propertyData, ownerId }
      repository.create.mockResolvedValue(mockCreatedProperty)

      const result = await service.createProperty(propertyData, ownerId)

      expect(repository.create).toHaveBeenCalledWith({
        data: {
          ...propertyData,
          ownerId,
          propertyType: PropertyType.SINGLE_FAMILY,
          User: {
            connect: { id: ownerId },
          },
        },
      })
      expect(result).toEqual(mockCreatedProperty)
    })

    it('should create property with units when units count is specified', async () => {
      const dataWithUnits = { ...propertyData, units: 5 }
      const mockCreatedProperty = { id: 'new-prop-id', ...dataWithUnits, ownerId }
      repository.createWithUnits.mockResolvedValue(mockCreatedProperty)

      const result = await service.createProperty(dataWithUnits, ownerId)

      expect(repository.createWithUnits).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dataWithUnits,
          ownerId,
          User: {
            connect: { id: ownerId },
          },
        }),
        5
      )
      expect(result).toEqual(mockCreatedProperty)
    })

    it('should handle errors properly', async () => {
      const error = new Error('Database error')
      repository.create.mockRejectedValue(error)
      errorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw error
      })

      await expect(service.createProperty(propertyData, ownerId)).rejects.toThrow('Database error')
      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'createProperty',
          resource: 'property',
          metadata: { ownerId, propertyName: propertyData.name },
        })
      )
    })
  })

  describe('updateProperty', () => {
    const propertyId = 'test-property-id'
    const ownerId = 'test-owner-id'
    const updateData = {
      name: 'Updated Property',
      description: 'Updated description',
      bedrooms: '3',
      bathrooms: '2',
    }

    it('should update property successfully', async () => {
      repository.exists.mockResolvedValue(true)
      const mockUpdatedProperty = { id: propertyId, ...updateData, ownerId }
      repository.update.mockResolvedValue(mockUpdatedProperty)

      const result = await service.updateProperty(propertyId, updateData, ownerId)

      expect(repository.exists).toHaveBeenCalledWith({ id: propertyId, ownerId })
      expect(repository.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: expect.objectContaining({
          name: updateData.name,
          description: updateData.description,
          bedrooms: 3,
          bathrooms: 2,
          updatedAt: expect.any(Date),
        }),
      })
      expect(result).toEqual(mockUpdatedProperty)
    })

    it('should throw NotFoundException when property does not exist', async () => {
      repository.exists.mockResolvedValue(false)

      await expect(service.updateProperty(propertyId, updateData, ownerId)).rejects.toThrow(NotFoundException)
      await expect(service.updateProperty(propertyId, updateData, ownerId)).rejects.toThrow(`Property with ID ${propertyId} not found`)
    })

    it('should handle empty string bedrooms/bathrooms correctly', async () => {
      repository.exists.mockResolvedValue(true)
      repository.update.mockResolvedValue({ id: propertyId })

      await service.updateProperty(propertyId, { bedrooms: '', bathrooms: '' }, ownerId)

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: expect.objectContaining({
          bedrooms: undefined,
          bathrooms: undefined,
        }),
      })
    })
  })

  describe('deleteProperty', () => {
    const propertyId = 'test-property-id'
    const ownerId = 'test-owner-id'

    beforeEach(() => {
      // Setup prisma.lease mock
      prisma.lease = {
        count: vi.fn(),
      } as any
    })

    it('should delete property when no active leases exist', async () => {
      repository.exists.mockResolvedValue(true)
      prisma.lease.count.mockResolvedValue(0)
      repository.deleteById.mockResolvedValue({ id: propertyId })

      const result = await service.deleteProperty(propertyId, ownerId)

      expect(repository.exists).toHaveBeenCalledWith({ id: propertyId, ownerId })
      expect(prisma.lease.count).toHaveBeenCalledWith({
        where: {
          Unit: { propertyId },
          status: 'ACTIVE',
        },
      })
      expect(repository.deleteById).toHaveBeenCalledWith(propertyId)
      expect(result).toEqual({ id: propertyId })
    })

    it('should throw ValidationException when active leases exist', async () => {
      repository.exists.mockResolvedValue(true)
      prisma.lease.count.mockResolvedValue(3)

      await expect(service.deleteProperty(propertyId, ownerId)).rejects.toThrow(ValidationException)
      await expect(service.deleteProperty(propertyId, ownerId)).rejects.toThrow('Cannot delete property with 3 active leases')
      expect(repository.deleteById).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException when property does not exist', async () => {
      repository.exists.mockResolvedValue(false)

      await expect(service.deleteProperty(propertyId, ownerId)).rejects.toThrow(NotFoundException)
      await expect(service.deleteProperty(propertyId, ownerId)).rejects.toThrow(`Property with ID ${propertyId} not found`)
      expect(prisma.lease.count).not.toHaveBeenCalled()
      expect(repository.deleteById).not.toHaveBeenCalled()
    })
  })

  describe('getPropertiesWithStats', () => {
    const ownerId = 'test-owner-id'

    beforeEach(() => {
      // Setup prisma.property mock
      prisma.property = {
        findMany: vi.fn(),
      } as any
    })

    it('should return properties with calculated statistics', async () => {
      const mockPropertiesWithUnits = [
        {
          id: 'prop-1',
          name: 'Property 1',
          Unit: [
            { id: 'unit-1', status: 'OCCUPIED', rent: 1000, _count: { Lease: 1 } },
            { id: 'unit-2', status: 'VACANT', rent: 1200, _count: { Lease: 0 } },
            { id: 'unit-3', status: 'OCCUPIED', rent: 1100, _count: { Lease: 1 } },
          ],
          _count: { Unit: 3, Document: 5 },
        },
      ]

      prisma.property.findMany.mockResolvedValue(mockPropertiesWithUnits)

      const result = await service.getPropertiesWithStats(ownerId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'prop-1',
        name: 'Property 1',
        stats: {
          totalUnits: 3,
          occupiedUnits: 2,
          vacantUnits: 1,
          occupancyRate: 66.66666666666666,
          monthlyRent: 2100,
          documentCount: 5,
        },
      }))
    })

    it('should handle properties with no units', async () => {
      const mockPropertiesNoUnits = [
        {
          id: 'prop-1',
          name: 'Property 1',
          Unit: [],
          _count: { Unit: 0, Document: 0 },
        },
      ]

      prisma.property.findMany.mockResolvedValue(mockPropertiesNoUnits)

      const result = await service.getPropertiesWithStats(ownerId)

      expect(result[0].stats).toEqual({
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        monthlyRent: 0,
        documentCount: 0,
      })
    })

    it('should handle errors properly', async () => {
      const error = new Error('Database error')
      prisma.property.findMany.mockRejectedValue(error)
      errorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw error
      })

      await expect(service.getPropertiesWithStats(ownerId)).rejects.toThrow('Database error')
      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'getPropertiesWithStats',
          resource: 'property',
          metadata: { ownerId },
        })
      )
    })
  })
})