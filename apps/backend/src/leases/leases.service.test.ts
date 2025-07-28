import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeasesService } from './leases.service'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { LeaseStatus } from '@prisma/client'
import { LEASE_STATUS } from '@tenantflow/shared/constants/leases'
import { mockPrismaClient, mockLogger } from '../test/setup'

// Mock global fetch
global.fetch = vi.fn()

// Mock the dependencies
const mockErrorHandler = {
	createNotFoundError: vi.fn(),
	createBusinessError: vi.fn(),
	createValidationError: vi.fn(),
	handleErrorEnhanced: vi.fn()
} as jest.Mocked<ErrorHandlerService>

describe('LeasesService', () => {
	let service: LeasesService
	let prismaService: PrismaService

	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetAllMocks()
		// Reset environment variables
		process.env.SUPABASE_URL = 'https://test.supabase.co'
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJtest.service.role.key'
		
		prismaService = mockPrismaClient as unknown as PrismaService
		service = new LeasesService(prismaService, mockErrorHandler)
	})

	describe('getLeasesByOwner', () => {
		const ownerId = 'owner-123'
		const mockLeases = [
			{
				id: 'lease-1',
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-12-31'),
				rentAmount: 1200,
				securityDeposit: 2400,
				status: 'ACTIVE',
				Tenant: {
					id: 'tenant-1',
					name: 'John Doe',
					User: {
						id: 'user-1',
						name: 'John Doe',
						email: 'john@test.com',
						phone: '+1234567890',
						avatarUrl: 'avatar.jpg'
					}
				},
				Unit: {
					id: 'unit-1',
					unitNumber: '101',
					Property: {
						id: 'prop-1',
						name: 'Test Property',
						address: '123 Test St',
						city: 'Test City',
						state: 'TS'
					}
				},
				Document: []
			}
		]

		it('should return transformed leases for a given owner', async () => {
			mockPrismaClient.lease.findMany.mockResolvedValue(mockLeases)

			const result = await service.getLeasesByOwner(ownerId)

			expect(mockPrismaClient.lease.findMany).toHaveBeenCalledWith({
				where: {
					Unit: {
						Property: {
							ownerId: ownerId
						}
					}
				},
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
					},
					Unit: {
						include: {
							Property: {
								select: {
									id: true,
									name: true,
									address: true,
									city: true,
									state: true
								}
							}
						}
					},
					Document: {
						orderBy: {
							createdAt: 'desc'
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				}
			})

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				id: 'lease-1',
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-12-31'),
				rentAmount: 1200,
				securityDeposit: 2400,
				status: 'ACTIVE',
				tenant: mockLeases[0].Tenant,
				unit: {
					id: 'unit-1',
					unitNumber: '101',
					property: mockLeases[0].Unit.Property,
					Property: undefined
				},
				property: mockLeases[0].Unit.Property,
				documents: []
			})
		})

		it('should return empty array when no leases found', async () => {
			mockPrismaClient.lease.findMany.mockResolvedValue([])

			const result = await service.getLeasesByOwner(ownerId)

			expect(result).toEqual([])
		})

		it('should handle database errors', async () => {
			const error = new Error('Database connection failed')
			mockPrismaClient.lease.findMany.mockRejectedValue(error)

			await expect(service.getLeasesByOwner(ownerId)).rejects.toThrow('Database connection failed')
		})
	})

	describe('getLeaseById', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-123'
		const mockLease = {
			id: leaseId,
			startDate: new Date('2024-01-01'),
			endDate: new Date('2024-12-31'),
			rentAmount: 1200,
			securityDeposit: 2400,
			status: 'ACTIVE',
			Tenant: {
				id: 'tenant-1',
				name: 'John Doe',
				User: {
					id: 'user-1',
					name: 'John Doe',
					email: 'john@test.com',
					phone: '+1234567890',
					avatarUrl: 'avatar.jpg'
				}
			},
			Unit: {
				id: 'unit-1',
				unitNumber: '101',
				Property: {
					id: 'prop-1',
					name: 'Test Property',
					address: '123 Test St',
					city: 'Test City',
					state: 'TS',
					zipCode: '12345'
				}
			},
			Document: []
		}

		it('should return transformed lease by ID for owner', async () => {
			mockPrismaClient.lease.findFirst.mockResolvedValue(mockLease)

			const result = await service.getLeaseById(leaseId, ownerId)

			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledWith({
				where: {
					id: leaseId,
					Unit: {
						Property: {
							ownerId: ownerId
						}
					}
				},
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
					},
					Unit: {
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
							}
						}
					},
					Document: {
						orderBy: {
							createdAt: 'desc'
						}
					}
				}
			})

			expect(result).toEqual({
				id: leaseId,
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-12-31'),
				rentAmount: 1200,
				securityDeposit: 2400,
				status: 'ACTIVE',
				tenant: mockLease.Tenant,
				unit: {
					id: 'unit-1',
					unitNumber: '101',
					property: mockLease.Unit.Property,
					Property: undefined
				},
				property: mockLease.Unit.Property,
				documents: []
			})
		})

		it('should return null when lease not found or not owned', async () => {
			mockPrismaClient.lease.findFirst.mockResolvedValue(null)

			const result = await service.getLeaseById(leaseId, ownerId)

			expect(result).toBeNull()
		})
	})

	describe('createLease', () => {
		const ownerId = 'owner-123'
		const leaseData = {
			unitId: 'unit-123',
			tenantId: 'tenant-123',
			startDate: '2024-01-01',
			endDate: '2024-12-31',
			rentAmount: 1200,
			securityDeposit: 2400,
			status: 'DRAFT'
		}
		const mockUnit = { id: 'unit-123', propertyId: 'prop-123' }
		const mockTenant = { id: 'tenant-123', name: 'John Doe' }
		const mockCreatedLease = {
			id: 'lease-new',
			...leaseData,
			startDate: new Date(leaseData.startDate),
			endDate: new Date(leaseData.endDate),
			Tenant: mockTenant,
			Unit: {
				id: 'unit-123',
				Property: {
					id: 'prop-123',
					name: 'Test Property',
					address: '123 Test St'
				}
			}
		}

		it('should create a new lease when unit and tenant exist and no overlapping lease', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)
			mockPrismaClient.tenant.findFirst.mockResolvedValue(mockTenant)
			mockPrismaClient.lease.findFirst.mockResolvedValue(null) // No overlapping lease
			mockPrismaClient.lease.create.mockResolvedValue(mockCreatedLease)

			const result = await service.createLease(ownerId, leaseData)

			expect(mockPrismaClient.unit.findFirst).toHaveBeenCalledWith({
				where: {
					id: leaseData.unitId,
					Property: {
						ownerId: ownerId
					}
				}
			})
			expect(mockPrismaClient.tenant.findFirst).toHaveBeenCalledWith({
				where: {
					id: leaseData.tenantId
				}
			})
			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledWith({
				where: {
					unitId: leaseData.unitId,
					status: {
						in: ['ACTIVE', 'DRAFT']
					},
					OR: [
						{
							AND: [
								{ startDate: { lte: new Date(leaseData.endDate) } },
								{ endDate: { gte: new Date(leaseData.startDate) } }
							]
						}
					]
				}
			})
			expect(mockPrismaClient.lease.create).toHaveBeenCalledWith({
				data: {
					unitId: leaseData.unitId,
					tenantId: leaseData.tenantId,
					startDate: new Date(leaseData.startDate),
					endDate: new Date(leaseData.endDate),
					rentAmount: leaseData.rentAmount,
					securityDeposit: leaseData.securityDeposit,
					status: leaseData.status
				},
				include: {
					Tenant: {
						include: {
							User: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					},
					Unit: {
						include: {
							Property: {
								select: {
									id: true,
									name: true,
									address: true
								}
							}
						}
					}
				}
			})
			expect(result).toEqual(mockCreatedLease)
		})

		it('should apply default status when not provided', async () => {
			const leaseDataWithoutStatus = { ...leaseData }
			delete leaseDataWithoutStatus.status

			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)
			mockPrismaClient.tenant.findFirst.mockResolvedValue(mockTenant)
			mockPrismaClient.lease.findFirst.mockResolvedValue(null)
			mockPrismaClient.lease.create.mockResolvedValue(mockCreatedLease)

			await service.createLease(ownerId, leaseDataWithoutStatus)

			expect(mockPrismaClient.lease.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: LEASE_STATUS.DRAFT
					})
				})
			)
		})

		it('should throw not found error when unit does not exist or not owned', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(null)
			const notFoundError = new Error('Unit not found')
			mockErrorHandler.createNotFoundError.mockImplementation(() => {
				throw notFoundError
			})

			await expect(service.createLease(ownerId, leaseData)).rejects.toThrow('Unit not found')

			expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Unit', leaseData.unitId)
		})

		it('should throw not found error when tenant does not exist', async () => {
			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)
			mockPrismaClient.tenant.findFirst.mockResolvedValue(null)
			const notFoundError = new Error('Tenant not found')
			mockErrorHandler.createNotFoundError.mockImplementation(() => {
				throw notFoundError
			})

			await expect(service.createLease(ownerId, leaseData)).rejects.toThrow('Tenant not found')

			expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Tenant', leaseData.tenantId)
		})

		it('should throw business error when overlapping lease exists', async () => {
			const overlappingLease = { id: 'existing-lease', status: 'ACTIVE' }
			mockPrismaClient.unit.findFirst.mockResolvedValue(mockUnit)
			mockPrismaClient.tenant.findFirst.mockResolvedValue(mockTenant)
			mockPrismaClient.lease.findFirst.mockResolvedValue(overlappingLease)
			const businessError = new Error('Unit has overlapping lease')
			mockErrorHandler.createBusinessError.mockImplementation(() => {
				throw businessError
			})

			await expect(service.createLease(ownerId, leaseData)).rejects.toThrow('Unit has overlapping lease')

			expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
				ErrorCode.CONFLICT,
				'Unit has overlapping lease for the specified dates',
				{ operation: 'createLease', resource: 'lease', metadata: { unitId: leaseData.unitId } }
			)
		})
	})

	describe('updateLease', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-123'
		const existingLease = {
			id: leaseId,
			unitId: 'unit-123',
			startDate: new Date('2024-01-01'),
			endDate: new Date('2024-12-31')
		}
		const updateData = {
			rentAmount: 1300,
			status: 'ACTIVE'
		}
		const mockUpdatedLease = {
			id: leaseId,
			...updateData,
			Tenant: { id: 'tenant-1', User: { id: 'user-1', name: 'John Doe', email: 'john@test.com' } },
			Unit: {
				id: 'unit-123',
				Property: {
					id: 'prop-123',
					name: 'Test Property',
					address: '123 Test St'
				}
			}
		}

		it('should update lease when owned by user and no date conflicts', async () => {
			mockPrismaClient.lease.findFirst.mockResolvedValue(existingLease)
			mockPrismaClient.lease.update.mockResolvedValue(mockUpdatedLease)

			const result = await service.updateLease(leaseId, ownerId, updateData)

			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledWith({
				where: {
					id: leaseId,
					Unit: {
						Property: {
							ownerId: ownerId
						}
					}
				}
			})
			expect(mockPrismaClient.lease.update).toHaveBeenCalledWith({
				where: {
					id: leaseId
				},
				data: {
					...updateData,
					startDate: undefined,
					endDate: undefined,
					status: updateData.status,
					updatedAt: expect.any(Date)
				},
				include: {
					Tenant: {
						include: {
							User: {
								select: {
									id: true,
									name: true,
									email: true
								}
							}
						}
					},
					Unit: {
						include: {
							Property: {
								select: {
									id: true,
									name: true,
									address: true
								}
							}
						}
					}
				}
			})
			expect(result).toEqual(mockUpdatedLease)
		})

		it('should check for overlapping leases when updating dates', async () => {
			const updateDataWithDates = {
				...updateData,
				startDate: '2024-02-01',
				endDate: '2024-11-30'
			}

			mockPrismaClient.lease.findFirst
				.mockResolvedValueOnce(existingLease) // First call for lease ownership
				.mockResolvedValueOnce(null) // Second call for overlapping lease check
			mockPrismaClient.lease.update.mockResolvedValue(mockUpdatedLease)

			await service.updateLease(leaseId, ownerId, updateDataWithDates)

			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledTimes(2)
			// Second call should check for overlapping leases
			expect(mockPrismaClient.lease.findFirst).toHaveBeenNthCalledWith(2, {
				where: {
					unitId: existingLease.unitId,
					id: { not: leaseId },
					status: {
						in: ['ACTIVE', 'DRAFT']
					},
					OR: [
						{
							AND: [
								{ startDate: { lte: new Date(updateDataWithDates.endDate) } },
								{ endDate: { gte: new Date(updateDataWithDates.startDate) } }
							]
						}
					]
				}
			})
		})

		it('should throw not found error when lease does not exist or not owned', async () => {
			mockPrismaClient.lease.findFirst.mockResolvedValue(null)
			const notFoundError = new Error('Lease not found')
			mockErrorHandler.createNotFoundError.mockImplementation(() => {
				throw notFoundError
			})

			await expect(service.updateLease(leaseId, ownerId, updateData)).rejects.toThrow('Lease not found')

			expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Lease', leaseId)
		})

		it('should throw business error when date update creates overlap', async () => {
			const overlappingLease = { id: 'other-lease', status: 'ACTIVE' }
			const updateDataWithDates = {
				startDate: '2024-02-01',
				endDate: '2024-11-30'
			}

			mockPrismaClient.lease.findFirst
				.mockResolvedValueOnce(existingLease)
				.mockResolvedValueOnce(overlappingLease)
			const businessError = new Error('Unit has overlapping lease')
			mockErrorHandler.createBusinessError.mockImplementation(() => {
				throw businessError
			})

			await expect(service.updateLease(leaseId, ownerId, updateDataWithDates)).rejects.toThrow('Unit has overlapping lease')

			expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
				ErrorCode.CONFLICT,
				'Unit has overlapping lease for the specified dates',
				{ operation: 'updateLease', resource: 'lease', metadata: { leaseId, unitId: existingLease.unitId } }
			)
		})
	})

	describe('deleteLease', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-123'

		it('should delete lease when not active', async () => {
			const mockLease = {
				id: leaseId,
				status: 'DRAFT',
				Unit: { id: 'unit-123' },
				Tenant: { id: 'tenant-123' }
			}
			const mockDeletedLease = { id: leaseId }

			mockPrismaClient.lease.findFirst.mockResolvedValue(mockLease)
			mockPrismaClient.lease.delete.mockResolvedValue(mockDeletedLease)

			const result = await service.deleteLease(leaseId, ownerId)

			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledWith({
				where: {
					id: leaseId,
					Unit: {
						Property: {
							ownerId: ownerId
						}
					}
				},
				include: {
					Unit: true,
					Tenant: true
				}
			})
			expect(mockPrismaClient.lease.delete).toHaveBeenCalledWith({
				where: {
					id: leaseId
				}
			})
			expect(result).toEqual(mockDeletedLease)
		})

		it('should throw not found error when lease does not exist or not owned', async () => {
			mockPrismaClient.lease.findFirst.mockResolvedValue(null)
			const notFoundError = new Error('Lease not found')
			mockErrorHandler.createNotFoundError.mockImplementation(() => {
				throw notFoundError
			})

			await expect(service.deleteLease(leaseId, ownerId)).rejects.toThrow('Lease not found')

			expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Lease', leaseId)
		})

		it('should throw business error when trying to delete active lease', async () => {
			const mockLease = {
				id: leaseId,
				status: 'ACTIVE',
				Unit: { id: 'unit-123' },
				Tenant: { id: 'tenant-123' }
			}

			mockPrismaClient.lease.findFirst.mockResolvedValue(mockLease)
			const businessError = new Error('Cannot delete active lease')
			mockErrorHandler.createBusinessError.mockImplementation(() => {
				throw businessError
			})

			await expect(service.deleteLease(leaseId, ownerId)).rejects.toThrow('Cannot delete active lease')

			expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
				ErrorCode.CONFLICT,
				'Cannot delete active lease',
				{ operation: 'deleteLease', resource: 'lease', metadata: { leaseId, status: 'ACTIVE' } }
			)
		})
	})

	describe('getLeaseStats', () => {
		const ownerId = 'owner-123'
		const mockStats = {
			totalLeases: 15,
			activeLeases: 10,
			pendingLeases: 3,
			expiredLeases: 2,
			expiringSoon: 5,
			_sum: { rentAmount: 12000, securityDeposit: 24000 },
			_avg: { rentAmount: 1200 }
		}

		it('should return comprehensive lease statistics', async () => {
			// Mock the count queries
			mockPrismaClient.lease.count
				.mockResolvedValueOnce(mockStats.totalLeases) // Total leases
				.mockResolvedValueOnce(mockStats.activeLeases) // Active leases
				.mockResolvedValueOnce(mockStats.pendingLeases) // Pending leases
				.mockResolvedValueOnce(mockStats.expiredLeases) // Expired leases
				.mockResolvedValueOnce(mockStats.expiringSoon) // Expiring soon

			// Mock the aggregate query
			mockPrismaClient.lease.aggregate.mockResolvedValue({
				_sum: mockStats._sum,
				_avg: mockStats._avg
			})

			const result = await service.getLeaseStats(ownerId)

			expect(result).toEqual({
				totalLeases: 15,
				activeLeases: 10,
				pendingLeases: 3,
				expiredLeases: 2,
				expiringSoon: 5,
				MONTHLYRentTotal: 12000,
				totalSecurityDeposits: 24000,
				averageRent: 1200
			})

			// Verify count queries
			expect(mockPrismaClient.lease.count).toHaveBeenCalledTimes(5)
			expect(mockPrismaClient.lease.aggregate).toHaveBeenCalledWith({
				where: {
					Unit: {
						Property: {
							ownerId: ownerId
						}
					},
					status: 'ACTIVE'
				},
				_sum: {
					rentAmount: true,
					securityDeposit: true
				},
				_avg: {
					rentAmount: true
				}
			})
		})

		it('should handle zero leases gracefully', async () => {
			mockPrismaClient.lease.count
				.mockResolvedValueOnce(0) // Total leases
				.mockResolvedValueOnce(0) // Active leases
				.mockResolvedValueOnce(0) // Pending leases
				.mockResolvedValueOnce(0) // Expired leases
				.mockResolvedValueOnce(0) // Expiring soon

			mockPrismaClient.lease.aggregate.mockResolvedValue({
				_sum: { rentAmount: null, securityDeposit: null },
				_avg: { rentAmount: null }
			})

			const result = await service.getLeaseStats(ownerId)

			expect(result).toEqual({
				totalLeases: 0,
				activeLeases: 0,
				pendingLeases: 0,
				expiredLeases: 0,
				expiringSoon: 0,
				MONTHLYRentTotal: 0,
				totalSecurityDeposits: 0,
				averageRent: 0
			})
		})
	})

	describe('sendRentReminder', () => {
		const ownerId = 'owner-123'
		const reminderId = 'lease-123-2024-01-01'
		const mockReminder = {
			id: reminderId,
			leaseId: 'lease-123',
			tenantId: 'tenant-123',
			propertyName: 'Test Property',
			tenantName: 'John Doe',
			tenantEmail: 'john@test.com',
			rentAmount: 1200,
			dueDate: '2024-01-01T00:00:00.000Z',
			reminderType: 'due' as const,
			daysToDue: 0,
			status: 'pending' as const,
			createdAt: '2024-01-01T00:00:00.000Z'
		}

		beforeEach(() => {
			// Mock getRentReminders to return our test reminder
			vi.spyOn(service, 'getRentReminders').mockResolvedValue({
				reminders: [mockReminder],
				stats: {
					totalReminders: 1,
					upcomingReminders: 0,
					dueToday: 1,
					overdue: 0,
					totalRentAmount: 1200,
					overdueAmount: 0
				}
			})
		})

		it('should send reminder successfully when email service is configured', async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ success: true })
			}
			global.fetch = vi.fn().mockResolvedValue(mockResponse)
			mockPrismaClient.reminderLog.create.mockResolvedValue({
				id: 'log-123',
				leaseId: 'lease-123',
				status: 'SENT'
			})

			const result = await service.sendRentReminder(reminderId, ownerId)

			expect(fetch).toHaveBeenCalledWith(
				'https://test.supabase.co/functions/v1/send-email',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: 'Bearer eyJtest.service.role.key',
						'User-Agent': 'TenantFlow-Backend/1.0'
					}),
					body: expect.stringContaining('"template":"rent-reminder"')
				})
			)

			expect(mockPrismaClient.reminderLog.create).toHaveBeenCalledWith({
				data: {
					leaseId: 'lease-123',
					userId: ownerId,
					type: 'RENT_REMINDER',
					status: 'SENT',
					recipientEmail: 'john@test.com',
					recipientName: 'John Doe',
					subject: 'Rent Reminder - Test Property',
					sentAt: expect.any(Date)
				}
			})

			expect(result).toEqual({
				...mockReminder,
				status: 'sent',
				sentAt: expect.any(String)
			})
		})

		it('should return error when email service is not configured', async () => {
			process.env.SUPABASE_URL = ''
			process.env.SUPABASE_SERVICE_ROLE_KEY = ''

			const result = await service.sendRentReminder(reminderId, ownerId)

			expect(result).toEqual({
				...mockReminder,
				status: 'failed',
				error: 'Email service not configured'
			})
		})

		it('should throw not found error when reminder does not exist', async () => {
			vi.spyOn(service, 'getRentReminders').mockResolvedValue({
				reminders: [],
				stats: {
					totalReminders: 0,
					upcomingReminders: 0,
					dueToday: 0,
					overdue: 0,
					totalRentAmount: 0,
					overdueAmount: 0
				}
			})

			const notFoundError = new Error('Reminder not found')
			mockErrorHandler.createNotFoundError.mockImplementation(() => {
				throw notFoundError
			})

			await expect(service.sendRentReminder(reminderId, ownerId)).rejects.toThrow('Reminder not found')

			expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Reminder', reminderId)
		})

		it('should validate input parameters', async () => {
			const validationError = new Error('Invalid parameters')
			mockErrorHandler.createValidationError.mockImplementation(() => {
				throw validationError
			})

			await expect(service.sendRentReminder('', ownerId)).rejects.toThrow('Invalid parameters')
			await expect(service.sendRentReminder(reminderId, '')).rejects.toThrow('Invalid parameters')

			expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
				'Invalid parameters: reminderId and ownerId are required',
				{ reminderId: 'Required', ownerId: 'Required' },
				{ operation: 'sendRentReminder', resource: 'lease' }
			)
		})

		it('should handle email API errors', async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				text: vi.fn().mockResolvedValue('Internal Server Error')
			}
			global.fetch = vi.fn().mockResolvedValue(mockResponse)
			mockPrismaClient.reminderLog.create.mockResolvedValue({})

			const businessError = new Error('Failed to send email notification')
			mockErrorHandler.createBusinessError.mockImplementation(() => {
				throw businessError
			})

			await expect(service.sendRentReminder(reminderId, ownerId)).rejects.toThrow('Failed to send email notification')

			expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
				ErrorCode.EMAIL_ERROR,
				'Failed to send email notification',
				{ operation: 'sendRentReminder', resource: 'lease', metadata: { reminderId, statusCode: 500 } }
			)
		})

		it('should handle network timeouts', async () => {
			const abortError = new Error('The operation was aborted')
			abortError.name = 'AbortError'
			global.fetch = vi.fn().mockRejectedValue(abortError)
			mockPrismaClient.reminderLog.create.mockResolvedValue({})
			mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
				throw abortError
			})

			await expect(service.sendRentReminder(reminderId, ownerId)).rejects.toThrow('The operation was aborted')

			expect(mockPrismaClient.reminderLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					status: 'FAILED',
					errorMessage: 'Email delivery failed',
					retryCount: 0
				})
			})
		})
	})

	describe('Edge cases and security', () => {
		it('should enforce owner isolation across all methods', async () => {
			const wrongOwnerId = 'wrong-owner'
			const leaseId = 'lease-123'

			// Test getLeaseById isolation
			mockPrismaClient.lease.findFirst.mockResolvedValue(null)
			const result = await service.getLeaseById(leaseId, wrongOwnerId)
			expect(result).toBeNull()

			// Verify the query includes owner filtering
			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						id: leaseId,
						Unit: {
							Property: {
								ownerId: wrongOwnerId
							}
						}
					})
				})
			)
		})

		it('should handle malformed input gracefully', async () => {
			const invalidId = 'not-a-uuid'
			const error = new Error('Invalid input syntax for type uuid')
			mockPrismaClient.lease.findFirst.mockRejectedValue(error)

			await expect(service.getLeaseById(invalidId, 'owner-123')).rejects.toThrow('Invalid input syntax for type uuid')
		})

		it('should handle concurrent operations', async () => {
			const ownerId = 'owner-123'
			const promises = Array(3).fill(null).map(() => service.getLeasesByOwner(ownerId))

			mockPrismaClient.lease.findMany.mockResolvedValue([])

			const results = await Promise.all(promises)

			expect(results).toHaveLength(3)
			expect(mockPrismaClient.lease.findMany).toHaveBeenCalledTimes(3)
		})

		it('should sanitize email content to prevent XSS', async () => {
			const ownerId = 'owner-123'
			const reminderId = 'lease-123-2024-01-01'
			const maliciousReminder = {
				id: reminderId,
				leaseId: 'lease-123',
				tenantId: 'tenant-123',
				propertyName: '<script>alert("xss")</script>Test Property',
				tenantName: 'John<script>alert("xss")</script>Doe',
				tenantEmail: 'john@test.com',
				rentAmount: 1200,
				dueDate: '2024-01-01T00:00:00.000Z',
				reminderType: 'due' as const,
				daysToDue: 0,
				status: 'pending' as const,
				createdAt: '2024-01-01T00:00:00.000Z'
			}

			vi.spyOn(service, 'getRentReminders').mockResolvedValue({
				reminders: [maliciousReminder],
				stats: {
					totalReminders: 1,
					upcomingReminders: 0,
					dueToday: 1,
					overdue: 0,
					totalRentAmount: 1200,
					overdueAmount: 0
				}
			})

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({ success: true })
			}
			global.fetch = vi.fn().mockResolvedValue(mockResponse)
			mockPrismaClient.reminderLog.create.mockResolvedValue({})

			await service.sendRentReminder(reminderId, ownerId)

			// Verify that script tags are removed from the email data
			expect(fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.not.stringContaining('<script>')
				})
			)

			// Verify that the reminder log stores sanitized data
			expect(mockPrismaClient.reminderLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					recipientName: 'JohnDoe', // Script tags removed
					subject: 'Rent Reminder - Test Property' // Script tags removed
				})
			})
		})

		it('should maintain data consistency during overlapping lease checks', async () => {
			const ownerId = 'owner-123'
			const leaseData = {
				unitId: 'unit-123',
				tenantId: 'tenant-123',
				startDate: '2024-01-01',
				endDate: '2024-12-31',
				rentAmount: 1200,
				securityDeposit: 2400
			}

			mockPrismaClient.unit.findFirst.mockResolvedValue({ id: 'unit-123' })
			mockPrismaClient.tenant.findFirst.mockResolvedValue({ id: 'tenant-123' })
			mockPrismaClient.lease.findFirst.mockResolvedValue(null)
			mockPrismaClient.lease.create.mockResolvedValue({ id: 'lease-new' })

			await service.createLease(ownerId, leaseData)

			// Verify that the overlapping lease check uses proper date comparison
			expect(mockPrismaClient.lease.findFirst).toHaveBeenCalledWith({
				where: {
					unitId: leaseData.unitId,
					status: {
						in: ['ACTIVE', 'DRAFT']
					},
					OR: [
						{
							AND: [
								{ startDate: { lte: new Date(leaseData.endDate) } },
								{ endDate: { gte: new Date(leaseData.startDate) } }
							]
						}
					]
				}
			})
		})
	})
})