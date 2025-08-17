import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PropertyType } from '@repo/shared'
import { PropertiesService } from './properties.service'
import { NotFoundException } from '../common/exceptions/base.exception'

// Mock the repository
jest.mock('./properties.repository')

describe('PropertiesService - Simplified Tests', () => {
	let propertiesService: PropertiesService
	let propertiesRepository: any
	let errorHandler: any

	const mockProperty = {
		id: 'prop-123',
		name: 'Test Property',
		address: '123 Test St',
		city: 'Test City',
		state: 'TX',
		zipCode: '12345',
		description: 'A test property',
		propertyType: PropertyType.SINGLE_FAMILY,
		imageUrl: 'https://example.com/image.jpg',
		bedrooms: 3,
		bathrooms: 2,
		ownerId: 'owner-123',
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
		Unit: [
			{
				id: 'unit-1',
				unitNumber: '1',
				status: 'OCCUPIED',
				rent: 1500
			}
		],
		_count: {
			Unit: 1
		}
	}

	const mockPropertyStats = {
		totalProperties: 5,
		totalUnits: 12
	}

	beforeEach(() => {
		jest.clearAllMocks()

		propertiesRepository = {
			findByOwnerWithUnits: jest.fn(),
			findById: jest.fn(),
			findByIdAndOwner: jest.fn(),
			create: jest.fn(),
			createWithUnits: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			deleteById: jest.fn(),
			countByOwner: jest.fn(),
			getStatsByOwner: jest.fn(),
			exists: jest.fn(),
			prismaClient: {
				lease: {
					count: jest.fn()
				},
				property: {
					findMany: jest.fn()
				}
			}
		}

		errorHandler = {
			handleErrorEnhanced: jest.fn().mockImplementation((err: any) => {
				throw err
			}),
			createNotFoundError: jest
				.fn()
				.mockImplementation(
					(...args: any[]) =>
						new NotFoundException(String(args[0]), String(args[1]))
				)
		}

		propertiesService = new PropertiesService(
			propertiesRepository,
			errorHandler
		)
	})

	describe('getPropertiesByOwner', () => {
		it('should return properties for owner with default options', async () => {
			propertiesRepository.findByOwnerWithUnits.mockResolvedValue([
				mockProperty
			])

			const result =
				await propertiesService.getPropertiesByOwner('owner-123')

			expect(
				propertiesRepository.findByOwnerWithUnits
			).toHaveBeenCalledWith('owner-123', {
				propertyType: undefined,
				search: undefined,
				limit: undefined,
				offset: undefined
			})
			expect(result).toEqual([mockProperty])
		})

		it('should handle query parameters correctly', async () => {
			const query = {
				propertyType: PropertyType.APARTMENT,
				search: 'downtown',
				limit: 10,
				offset: 0
			}
			propertiesRepository.findByOwnerWithUnits.mockResolvedValue([
				mockProperty
			])

			await propertiesService.getPropertiesByOwner('owner-123', query)

			expect(
				propertiesRepository.findByOwnerWithUnits
			).toHaveBeenCalledWith('owner-123', {
				propertyType: PropertyType.APARTMENT,
				search: 'downtown',
				limit: 10,
				offset: 0
			})
		})

		it('should handle repository errors', async () => {
			const error = new Error('Database connection failed')
			propertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)

			await expect(
				propertiesService.getPropertiesByOwner('owner-123')
			).rejects.toThrow('Database connection failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				error,
				{
					operation: 'getByOwner',
					resource: 'property',
					metadata: { ownerId: 'owner-123' }
				}
			)
		})
	})

	describe('getPropertyStats', () => {
		it('should return property statistics for owner', async () => {
			propertiesRepository.getStatsByOwner.mockResolvedValue(
				mockPropertyStats
			)

			const result = await propertiesService.getPropertyStats('owner-123')

			expect(propertiesRepository.getStatsByOwner).toHaveBeenCalledWith(
				'owner-123'
			)
			expect(result).toEqual(mockPropertyStats)
		})

		it('should handle repository errors', async () => {
			const error = new Error('Stats query failed')
			propertiesRepository.getStatsByOwner.mockRejectedValue(error)

			await expect(
				propertiesService.getPropertyStats('owner-123')
			).rejects.toThrow('Stats query failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				error,
				{
					operation: 'getStats',
					resource: 'property',
					metadata: { ownerId: 'owner-123' }
				}
			)
		})
	})

	describe('getPropertyById', () => {
		it('should return property when found', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(
				mockProperty
			)

			const result = await propertiesService.getPropertyById(
				'prop-123',
				'owner-123'
			)

			expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'prop-123',
				'owner-123',
				true // includeUnits
			)
			expect(result).toEqual(mockProperty)
		})

		it('should throw not found error when property does not exist', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(null)

			await expect(
				propertiesService.getPropertyById('prop-123', 'owner-123')
			).rejects.toThrow(NotFoundException)

			expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'prop-123',
				'owner-123',
				true
			)
		})

		it('should handle repository errors', async () => {
			const error = new Error('Query failed')
			propertiesRepository.findByIdAndOwner.mockRejectedValue(error)

			await expect(
				propertiesService.getPropertyById('prop-123', 'owner-123')
			).rejects.toThrow('Query failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				error,
				{
					operation: 'getByIdOrThrow',
					resource: 'property',
					metadata: { id: 'prop-123', ownerId: 'owner-123' }
				}
			)
		})
	})

	describe('createProperty', () => {
		const mockPropertyData = {
			name: 'New Property',
			address: '456 New St',
			city: 'New City',
			state: 'CA',
			zipCode: '54321',
			description: 'A new property',
			propertyType: PropertyType.APARTMENT,
			stripeCustomerId: 'cus_123'
		}

		it('should create property without units', async () => {
			propertiesRepository.create.mockResolvedValue(mockProperty)

			const result = await propertiesService.createProperty(
				mockPropertyData,
				'owner-123'
			)

			expect(propertiesRepository.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					User: { connect: { id: 'owner-123' } },
					address: mockPropertyData.address,
					city: mockPropertyData.city,
					description: mockPropertyData.description,
					name: mockPropertyData.name,
					propertyType: PropertyType.APARTMENT,
					state: mockPropertyData.state,
					stripeCustomerId: mockPropertyData.stripeCustomerId,
					zipCode: mockPropertyData.zipCode
				})
			})
			expect(result).toEqual(mockProperty)
		})

		it('should create property with units when specified', async () => {
			const propertyDataWithUnits = {
				...mockPropertyData,
				units: 3
			}
			propertiesRepository.createWithUnits.mockResolvedValue(mockProperty)

			const result = await propertiesService.createProperty(
				propertyDataWithUnits,
				'owner-123'
			)

			expect(propertiesRepository.createWithUnits).toHaveBeenCalledWith(
				expect.objectContaining({
					User: { connect: { id: 'owner-123' } },
					address: propertyDataWithUnits.address,
					city: propertyDataWithUnits.city,
					description: propertyDataWithUnits.description,
					name: propertyDataWithUnits.name,
					propertyType: PropertyType.APARTMENT,
					state: propertyDataWithUnits.state,
					stripeCustomerId: propertyDataWithUnits.stripeCustomerId,
					zipCode: propertyDataWithUnits.zipCode,
					units: 3
				}),
				3
			)
			expect(result).toEqual(mockProperty)
		})

		it('should handle creation errors', async () => {
			const error = new Error('Creation failed')
			propertiesRepository.create.mockRejectedValue(error)

			await expect(
				propertiesService.createProperty(mockPropertyData, 'owner-123')
			).rejects.toThrow('Creation failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				error,
				{
					operation: 'create',
					resource: 'property',
					metadata: {
						ownerId: 'owner-123',
						propertyName: 'New Property'
					}
				}
			)
		})
	})

	describe('updateProperty', () => {
		const mockUpdateData = {
			name: 'Updated Property',
			description: 'Updated description',
			bathrooms: '2',
			bedrooms: '3',
			imageUrl: 'https://example.com/new-image.jpg'
		}

		it('should update property when it exists', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(
				mockProperty
			)
			propertiesRepository.update.mockResolvedValue({
				...mockProperty,
				...mockUpdateData
			})

			const result = await propertiesService.updateProperty(
				'prop-123',
				mockUpdateData,
				'owner-123'
			)

			expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'prop-123',
				'owner-123',
				true
			)

			expect(propertiesRepository.update).toHaveBeenCalledWith({
				where: { id: 'prop-123', ownerId: 'owner-123' },
				data: expect.objectContaining({
					name: 'Updated Property',
					description: 'Updated description',
					imageUrl: 'https://example.com/new-image.jpg',
					updatedAt: expect.any(Date)
				})
			})

			expect(result.name).toBe('Updated Property')
		})

		it('should throw not found error when property does not exist', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(null)

			await expect(
				propertiesService.updateProperty(
					'prop-123',
					mockUpdateData,
					'owner-123'
				)
			).rejects.toThrow(NotFoundException)

			expect(propertiesRepository.update).not.toHaveBeenCalled()
		})

		it('should handle update errors', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(
				mockProperty
			)
			const error = new Error('Update failed')
			propertiesRepository.update.mockRejectedValue(error)

			await expect(
				propertiesService.updateProperty(
					'prop-123',
					mockUpdateData,
					'owner-123'
				)
			).rejects.toThrow('Update failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				error,
				{
					operation: 'update',
					resource: 'property',
					metadata: { id: 'prop-123', ownerId: 'owner-123' }
				}
			)
		})
	})

	describe('deleteProperty', () => {
		it('should delete property when it exists and has no active leases', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(
				mockProperty
			)
			propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
			propertiesRepository.delete.mockResolvedValue(mockProperty)

			const result = await propertiesService.deleteProperty(
				'prop-123',
				'owner-123'
			)

			expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'prop-123',
				'owner-123',
				true
			)
			expect(
				propertiesRepository.prismaClient.lease.count
			).toHaveBeenCalledWith({
				where: {
					Unit: {
						propertyId: 'prop-123'
					},
					status: 'ACTIVE'
				}
			})
			expect(propertiesRepository.delete).toHaveBeenCalledWith({
				where: { id: 'prop-123', ownerId: 'owner-123' }
			})
			expect(result).toEqual(mockProperty)
		})

		it('should throw not found error when property does not exist', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(null)

			await expect(
				propertiesService.deleteProperty('prop-123', 'owner-123')
			).rejects.toThrow(NotFoundException)

			expect(
				propertiesRepository.prismaClient.lease.count
			).not.toHaveBeenCalled()
			expect(propertiesRepository.delete).not.toHaveBeenCalled()
		})

		it('should handle deletion errors', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(
				mockProperty
			)
			propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
			const error = new Error('Deletion failed')
			propertiesRepository.delete.mockRejectedValue(error)

			await expect(
				propertiesService.deleteProperty('prop-123', 'owner-123')
			).rejects.toThrow('Deletion failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				error,
				{
					operation: 'delete',
					resource: 'property',
					metadata: { id: 'prop-123', ownerId: 'owner-123' }
				}
			)
		})
	})

	describe('Alias methods', () => {
		it('should call getPropertiesByOwner via findAllByOwner', async () => {
			propertiesRepository.findByOwnerWithUnits.mockResolvedValue([
				mockProperty
			])

			const query = { propertyType: PropertyType.APARTMENT }
			const result = await propertiesService.findAllByOwner(
				'owner-123',
				query
			)

			expect(
				propertiesRepository.findByOwnerWithUnits
			).toHaveBeenCalledWith(
				'owner-123',
				expect.objectContaining({
					propertyType: PropertyType.APARTMENT
				})
			)
			expect(result).toEqual([mockProperty])
		})

		it('should call getPropertyById via findById', async () => {
			propertiesRepository.findByIdAndOwner.mockResolvedValue(
				mockProperty
			)

			const result = await propertiesService.findById(
				'prop-123',
				'owner-123'
			)

			expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'prop-123',
				'owner-123',
				true
			)
			expect(result).toEqual(mockProperty)
		})

		it('should call createProperty via create', async () => {
			const propertyData = {
				name: 'Test Property',
				address: '123 Test St',
				city: 'Test City',
				state: 'TX',
				zipCode: '12345'
			}
			propertiesRepository.create.mockResolvedValue(mockProperty)

			const result = await propertiesService.create(
				propertyData,
				'owner-123'
			)

			expect(propertiesRepository.create).toHaveBeenCalledWith({
				data: {
					User: { connect: { id: 'owner-123' } },
					address: propertyData.address,
					city: propertyData.city,
					name: propertyData.name,
					propertyType: 'SINGLE_FAMILY',
					state: propertyData.state,
					zipCode: propertyData.zipCode
				}
			})
			expect(result).toEqual(mockProperty)
		})
	})
})
