import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UnitsService } from './units.service'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { UnitStatus } from '@prisma/client'
import { UNIT_STATUS } from '@tenantflow/shared/constants/properties'
import { mockPrismaClient, mockLogger } from '../test/setup'

// Mock the dependencies
const mockErrorHandler = {
	createPermissionError: vi.fn(),
	createBusinessError: vi.fn(),
	handleErrorEnhanced: vi.fn()
} as jest.Mocked<ErrorHandlerService>

describe('UnitsService', () => {
	let service: UnitsService
	let prismaService: PrismaService

	beforeEach(() => {
		vi.clearAllMocks()
		prismaService = mockPrismaClient as unknown as PrismaService
		service = new UnitsService(prismaService, mockErrorHandler)
	})

	describe('getUnitsByOwner', () => {
		const ownerId = 'owner-123'
		const mockUnits = [
			{
				id: 'unit-1',
				unitNumber: '101',
				bedrooms: 2,
				bathrooms: 1,
				squareFeet: 800,
				rent: 1200,
				status: 'VACANT',
				Property: {
					id: 'prop-1',
					name: 'Test Property',
					address: '123 Test St',
					city: 'Test City',
					state: 'TS'
				},
				Lease: [],
				MaintenanceRequest: [],
				_count: {
					Lease: 0,
					MaintenanceRequest: 0
				}
			},
			{
				id: 'unit-2',
				unitNumber: '102',
				bedrooms: 1,
				bathrooms: 1,
				squareFeet: 600,
				rent: 1000,
				status: 'OCCUPIED',
				Property: {
					id: 'prop-1',
					name: 'Test Property',
					address: '123 Test St',
					city: 'Test City',
					state: 'TS'
				},
				Lease: [
					{
						id: 'lease-1',
						status: 'ACTIVE',
						Tenant: {
							id: 'tenant-1',
							name: 'John Doe',
							email: 'john@test.com'
						}
					}
				],
				MaintenanceRequest: [],
				_count: {
					Lease: 1,
					MaintenanceRequest: 0
				}
			}
		]

		it('should return units for a given owner with proper ordering', async () => {
			mockPrismaClient.unit.findMany.mockResolvedValue(mockUnits)

			const result = await service.getUnitsByOwner(ownerId)

			expect(mockPrismaClient.unit.findMany).toHaveBeenCalledWith({
				where: {
					Property: {
						ownerId: ownerId
					}
				},
				include: {
					Property: {
						select: {
							id: true,
							name: true,
							address: true,
							city: true,
							state: true
						}
					},
					Lease: {
						where: {
							status: 'ACTIVE'
						},
						include: {
							Tenant: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					},
					MaintenanceRequest: {
						where: {
							status: {
								not: 'COMPLETED'
							}
						},
						orderBy: {
							createdAt: 'desc'
						},
						take: 5
					},
					_count: {
						select: {
							Lease: true,
							MaintenanceRequest: true
						}
					}
				},
				orderBy: [
					{
						Property: {
							name: 'asc'
						}
					},
					{
						unitNumber: 'asc'
					}
				]
			})
			expect(result).toEqual(mockUnits)
		})

		it('should handle database errors', async () => {
			const error = new Error('Database connection failed')
			mockPrismaClient.unit.findMany.mockRejectedValue(error)

			await expect(service.getUnitsByOwner(ownerId)).rejects.toThrow('Database connection failed')
		})

		it('should return empty array when no units found', async () => {
			mockPrismaClient.unit.findMany.mockResolvedValue([])

			const result = await service.getUnitsByOwner(ownerId)

			expect(result).toEqual([])
		})
	})

	describe('getUnitsByProperty', () => {
		const propertyId = 'prop-123'
		const ownerId = 'owner-123'
		const mockProperty = { id: propertyId, ownerId }
		const mockUnits = [
			{
				id: 'unit-1',
				unitNumber: '101',
				propertyId,
				Lease: [],
				MaintenanceRequest: [],
				_count: { Lease: 0, MaintenanceRequest: 0 }
			}
		]

		it('should return units for a property owned by the user', async () => {
			mockPrismaClient.property.findFirst.mockResolvedValue(mockProperty)
			mockPrismaClient.unit.findMany.mockResolvedValue(mockUnits)

			const result = await service.getUnitsByProperty(propertyId, ownerId)

			expect(mockPrismaClient.property.findFirst).toHaveBeenCalledWith({
				where: {
					id: propertyId,
					ownerId: ownerId
				}
			})
			expect(mockPrismaClient.unit.findMany).toHaveBeenCalledWith({
				where: {
					propertyId: propertyId
				},
				include: {
					Lease: {
						where: {
							status: 'ACTIVE'
						},
						include: {
							Tenant: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					},
					MaintenanceRequest: {
						where: {
							status: {
								not: 'COMPLETED'
							}
						},
						orderBy: {
							createdAt: 'desc'
						}
					},
					_count: {
						select: {
							Lease: true,
							MaintenanceRequest: true
						}
					}
				},
				orderBy: {
					unitNumber: 'asc'
				}
			})
			expect(result).toEqual(mockUnits)
		})

		it('should throw permission error for property not owned by user', async () => {
			mockPrismaClient.property.findFirst.mockResolvedValue(null)
			const permissionError = new Error('Permission denied')
			mockErrorHandler.createPermissionError.mockImplementation(() => {
				throw permissionError
			})

			await expect(service.getUnitsByProperty(propertyId, ownerId)).rejects.toThrow('Permission denied')

			expect(mockErrorHandler.createPermissionError).toHaveBeenCalledWith(
				'access property',
				'property',
				{ operation: 'getUnitsByProperty', metadata: { propertyId, ownerId } }
			)
		})
	})

	describe('getUnitById', () => {
		const unitId = 'unit-123'
		const ownerId = 'owner-123'
		const mockUnit = {
			id: unitId,
			unitNumber: '101',
			Property: {
				id: 'prop-1',
				name: 'Test Property',
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				zipCode: '12345'
			},
			Lease: [],
			MaintenanceRequest: [],
			Inspection: []
		}

		it('should return unit by ID for owner', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)

			const result = await service.getUnitById(unitId, ownerId)

			expect(mockPrismaClient.unit.findFirst).toHaveBeenCalledWith({
				where: {
					id: unitId,
					Property: {
						ownerId: ownerId
					}
				},
				include: {
					Property: {
						select: {
							id: true,
							name: true,
							address: true,
							city: true,
							state: true,
							zipCode: true
						}
					},
					Lease: {
						include: {
							Tenant: {
								include: {
									User: {
										select: {
											id: true,
											name: true,
											email: true,
											phone: true,
											avatarUrl: true
										}
									}
								}
							}
						},
						orderBy: {
							createdAt: 'desc'
						}
					},
					MaintenanceRequest: {
						orderBy: {
							createdAt: 'desc'
						},
						include: {
							Expense: true
						}
					},
					Inspection: {
						orderBy: {
							scheduledDate: 'desc'
						},
						take: 5
					}
				}
			})
			expect(result).toEqual(mockUnit)
		})

		it('should return null when unit not found or not owned', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(null)

			const result = await service.getUnitById(unitId, ownerId)

			expect(result).toBeNull()
		})
	})

	describe('createUnit', () => {
		const ownerId = 'owner-123'
		const propertyId = 'prop-123'
		const mockProperty = { id: propertyId, ownerId }
		const unitData = {
			unitNumber: '103',
			propertyId,
			bedrooms: 2,
			bathrooms: 1,
			squareFeet: 800,
			rent: 1200,
			status: 'VACANT'
		}
		const mockCreatedUnit = {
			id: 'unit-new',
			...unitData,
			Property: {
				id: propertyId,
				name: 'Test Property',
				address: '123 Test St'
			},
			_count: {
				Lease: 0,
				MaintenanceRequest: 0
			}
		}

		it('should create a new unit in owned property', async () => {
			mockPrismaClient.property.findFirst.mockResolvedValue(mockProperty)
			mockPrismaClient.unit.create.mockResolvedValue(mockCreatedUnit)

			const result = await service.createUnit(ownerId, unitData)

			expect(mockPrismaClient.property.findFirst).toHaveBeenCalledWith({
				where: {
					id: propertyId,
					ownerId: ownerId
				}
			})
			expect(mockPrismaClient.unit.create).toHaveBeenCalledWith({
				data: {
					unitNumber: unitData.unitNumber,
					propertyId: unitData.propertyId,
					bedrooms: unitData.bedrooms,
					bathrooms: unitData.bathrooms,
					squareFeet: unitData.squareFeet,
					rent: unitData.rent,
					status: unitData.status
				},
				include: {
					Property: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					_count: {
						select: {
							Lease: true,
							MaintenanceRequest: true
						}
					}
				}
			})
			expect(result).toEqual(mockCreatedUnit)
		})

		it('should apply default values for optional fields', async () => {
			const minimalUnitData = {
				unitNumber: '104',
				propertyId,
				rent: 1000
			}

			mockPrismaClient.property.findFirst.mockResolvedValue(mockProperty)
			mockPrismaClient.unit.create.mockResolvedValue(mockCreatedUnit)

			await service.createUnit(ownerId, minimalUnitData)

			expect(mockPrismaClient.unit.create).toHaveBeenCalledWith({
				data: {
					unitNumber: minimalUnitData.unitNumber,
					propertyId: minimalUnitData.propertyId,
					bedrooms: 1, // Default value
					bathrooms: 1, // Default value
					squareFeet: undefined,
					rent: minimalUnitData.rent,
					status: UNIT_STATUS.VACANT // Default status
				},
				include: {
					Property: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					_count: {
						select: {
							Lease: true,
							MaintenanceRequest: true
						}
					}
				}
			})
		})

		it('should throw permission error for property not owned by user', async () => {
			mockPrismaClient.property.findFirst.mockResolvedValue(null)
			const permissionError = new Error('Permission denied')
			mockErrorHandler.createPermissionError.mockImplementation(() => {
				throw permissionError
			})

			await expect(service.createUnit(ownerId, unitData)).rejects.toThrow('Permission denied')

			expect(mockErrorHandler.createPermissionError).toHaveBeenCalledWith(
				'create unit in property',
				'property',
				{ operation: 'createUnit', metadata: { propertyId, ownerId } }
			)
		})
	})

	describe('updateUnit', () => {
		const unitId = 'unit-123'
		const ownerId = 'owner-123'
		const mockExistingUnit = { id: unitId, propertyId: 'prop-123' }
		const updateData = {
			unitNumber: '101A',
			rent: 1300,
			status: 'MAINTENANCE'
		}
		const mockUpdatedUnit = {
			id: unitId,
			...updateData,
			Property: {
				id: 'prop-123',
				name: 'Test Property',
				address: '123 Test St'
			},
			_count: {
				Lease: 0,
				MaintenanceRequest: 1
			}
		}

		it('should update unit when owned by user', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(mockExistingUnit)
			mockPrismaClient.unit.update.mockResolvedValue(mockUpdatedUnit)

			const result = await service.updateUnit(unitId, ownerId, updateData)

			expect(mockPrismaClient.unit.findFirst).toHaveBeenCalledWith({
				where: {
					id: unitId,
					Property: {
						ownerId: ownerId
					}
				}
			})
			expect(mockPrismaClient.unit.update).toHaveBeenCalledWith({
				where: {
					id: unitId
				},
				data: {
					...updateData,
					status: updateData.status,
					updatedAt: expect.any(Date)
				},
				include: {
					Property: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					_count: {
						select: {
							Lease: true,
							MaintenanceRequest: true
						}
					}
				}
			})
			expect(result).toEqual(mockUpdatedUnit)
		})

		it('should throw permission error for unit not owned by user', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(null)
			const permissionError = new Error('Permission denied')
			mockErrorHandler.createPermissionError.mockImplementation(() => {
				throw permissionError
			})

			await expect(service.updateUnit(unitId, ownerId, updateData)).rejects.toThrow('Permission denied')

			expect(mockErrorHandler.createPermissionError).toHaveBeenCalledWith(
				'update unit',
				'unit',
				{ operation: 'updateUnit', metadata: { unitId, ownerId } }
			)
		})
	})

	describe('deleteUnit', () => {
		const unitId = 'unit-123'
		const ownerId = 'owner-123'

		it('should delete unit when no active leases', async () => {
			const mockUnit = {
				id: unitId,
				Lease: [] // No active leases
			}
			const mockDeletedUnit = { id: unitId }

			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)
			mockPrismaClient.unit.delete.mockResolvedValue(mockDeletedUnit)

			const result = await service.deleteUnit(unitId, ownerId)

			expect(mockPrismaClient.unit.findFirst).toHaveBeenCalledWith({
				where: {
					id: unitId,
					Property: {
						ownerId: ownerId
					}
				},
				include: {
					Lease: {
						where: {
							status: 'ACTIVE'
						}
					}
				}
			})
			expect(mockPrismaClient.unit.delete).toHaveBeenCalledWith({
				where: {
					id: unitId
				}
			})
			expect(result).toEqual(mockDeletedUnit)
		})

		it('should throw permission error for unit not owned by user', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(null)
			const permissionError = new Error('Permission denied')
			mockErrorHandler.createPermissionError.mockImplementation(() => {
				throw permissionError
			})

			await expect(service.deleteUnit(unitId, ownerId)).rejects.toThrow('Permission denied')

			expect(mockErrorHandler.createPermissionError).toHaveBeenCalledWith(
				'delete unit',
				'unit',
				{ operation: 'deleteUnit', metadata: { unitId, ownerId } }
			)
		})

		it('should throw business error when unit has active leases', async () => {
			const mockUnit = {
				id: unitId,
				Lease: [{ id: 'lease-1', status: 'ACTIVE' }] // Has active lease
			}
			const businessError = new Error('Cannot delete unit with active leases')
			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)
			mockErrorHandler.createBusinessError.mockImplementation(() => {
				throw businessError
			})

			await expect(service.deleteUnit(unitId, ownerId)).rejects.toThrow('Cannot delete unit with active leases')

			expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
				ErrorCode.CONFLICT,
				'Cannot delete unit with active leases',
				{ operation: 'deleteUnit', resource: 'unit', metadata: { unitId, activeLeases: 1 } }
			)
		})
	})

	describe('getUnitStats', () => {
		const ownerId = 'owner-123'
		const mockStats = {
			totalUnits: 10,
			occupiedUnits: 7,
			vacantUnits: 2,
			maintenanceUnits: 1,
			_avg: { rent: 1200 },
			_sum: { rent: 12000 }
		}

		it('should return comprehensive unit statistics', async () => {
			// Mock the count queries
			mockPrismaClient.unit.count
				.mockResolvedValueOnce(mockStats.totalUnits) // Total units
				.mockResolvedValueOnce(mockStats.occupiedUnits) // Occupied units
				.mockResolvedValueOnce(mockStats.vacantUnits) // Vacant units
				.mockResolvedValueOnce(mockStats.maintenanceUnits) // Maintenance units

			// Mock the aggregate query
			mockPrismaClient.unit.aggregate.mockResolvedValue({
				_avg: mockStats._avg,
				_sum: mockStats._sum
			})

			const result = await service.getUnitStats(ownerId)

			expect(result).toEqual({
				totalUnits: 10,
				occupiedUnits: 7,
				vacantUnits: 2,
				maintenanceUnits: 1,
				averageRent: 1200,
				totalRentPotential: 12000,
				occupancyRate: 70 // (7 / 10) * 100
			})

			// Verify count queries
			expect(mockPrismaClient.unit.count).toHaveBeenCalledTimes(4)
			expect(mockPrismaClient.unit.aggregate).toHaveBeenCalledWith({
				where: {
					Property: {
						ownerId: ownerId
					}
				},
				_avg: {
					rent: true
				},
				_sum: {
					rent: true
				}
			})
		})

		it('should handle zero units gracefully', async () => {
			mockPrismaClient.unit.count
				.mockResolvedValueOnce(0) // Total units
				.mockResolvedValueOnce(0) // Occupied units
				.mockResolvedValueOnce(0) // Vacant units
				.mockResolvedValueOnce(0) // Maintenance units

			mockPrismaClient.unit.aggregate.mockResolvedValue({
				_avg: { rent: null },
				_sum: { rent: null }
			})

			const result = await service.getUnitStats(ownerId)

			expect(result).toEqual({
				totalUnits: 0,
				occupiedUnits: 0,
				vacantUnits: 0,
				maintenanceUnits: 0,
				averageRent: 0,
				totalRentPotential: 0,
				occupancyRate: 0
			})
		})

		it('should handle database errors in parallel queries', async () => {
			const error = new Error('Database error')
			mockPrismaClient.unit.count.mockRejectedValue(error)

			await expect(service.getUnitStats(ownerId)).rejects.toThrow('Database error')
		})
	})

	describe('Edge cases and security', () => {
		it('should enforce owner isolation across all methods', async () => {
			const wrongOwnerId = 'wrong-owner'
			const unitId = 'unit-123'
			const propertyId = 'prop-123'

			// Test getUnitById isolation
			mockPrismaClient.unit.findFirst.mockResolvedValue(null)
			const result = await service.getUnitById(unitId, wrongOwnerId)
			expect(result).toBeNull()

			// Test getUnitsByProperty isolation
			mockPrismaClient.property.findFirst.mockResolvedValue(null)
			const permissionError = new Error('Permission denied')
			mockErrorHandler.createPermissionError.mockImplementation(() => {
				throw permissionError
			})

			await expect(service.getUnitsByProperty(propertyId, wrongOwnerId)).rejects.toThrow('Permission denied')
		})

		it('should handle malformed input gracefully', async () => {
			const invalidId = 'not-a-uuid'
			const error = new Error('Invalid input syntax for type uuid')
			mockPrismaClient.unit.findFirst.mockRejectedValue(error)

			await expect(service.getUnitById(invalidId, 'owner-123')).rejects.toThrow('Invalid input syntax for type uuid')
		})

		it('should handle concurrent operations', async () => {
			const ownerId = 'owner-123'
			const promises = Array(3).fill(null).map(() => service.getUnitsByOwner(ownerId))

			mockPrismaClient.unit.findMany.mockResolvedValue([])

			const results = await Promise.all(promises)

			expect(results).toHaveLength(3)
			expect(mockPrismaClient.unit.findMany).toHaveBeenCalledTimes(3)
		})

		it('should maintain data consistency during updates', async () => {
			const unitId = 'unit-123'
			const ownerId = 'owner-123'
			const updateData = { rent: 1500 }

			mockPrismaClient.unit.findFirst.mockResolvedValue({ id: unitId })
			mockPrismaClient.unit.update.mockResolvedValue({ id: unitId, ...updateData })

			await service.updateUnit(unitId, ownerId, updateData)

			// Verify that updatedAt is automatically set
			expect(mockPrismaClient.unit.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						updatedAt: expect.any(Date)
					})
				})
			)
		})
	})
})