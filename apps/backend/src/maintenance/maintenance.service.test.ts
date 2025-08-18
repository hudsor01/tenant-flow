import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { MaintenanceService } from './maintenance.service'
import { NotFoundException } from '../common/exceptions/base.exception'

// Mock the dependencies
jest.mock('./maintenance-request-supabase.repository')
jest.mock('../common/errors/error-handler.service')
jest.mock('../common/supabase/supabase.service')

describe('MaintenanceService - Simplified Tests', () => {
	let service: MaintenanceService
	let mockRepository: any
	let mockErrorHandler: any
	let mockSupabaseService: any
	let mockPrismaService: any

	const mockMaintenanceRequest = {
		id: 'maint-123',
		title: 'Test Request',
		description: 'Test description',
		priority: 'MEDIUM',
		status: 'OPEN',
		unitId: 'unit-123',
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01')
	}

	beforeEach(() => {
		jest.clearAllMocks()

		mockRepository = {
			findByOwner: jest.fn(),
			findByIdAndOwner: jest.fn(),
			findByUnit: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			deleteById: jest.fn(),
			getStatsByOwner: jest.fn(),
			findManyByOwner: jest.fn(),
			findMany: jest.fn(),
			prismaClient: {
				maintenanceRequest: {
					findFirst: jest.fn(),
					findUnique: jest.fn(),
					findMany: jest.fn(),
					create: jest.fn(),
					update: jest.fn(),
					delete: jest.fn()
				}
			}
		}

		mockErrorHandler = {
			handleError: jest.fn().mockImplementation((error: any) => {
				throw error
			}),
			createNotFoundError: jest
				.fn()
				.mockImplementation(
					(...args: any[]) =>
						new NotFoundException(String(args[0]), String(args[1]))
				),
			createValidationError: jest
				.fn()
				.mockImplementation(
					(...args: any[]) => new Error(`Validation: ${args[0]}`)
				),
			createBusinessError: jest
				.fn()
				.mockImplementation(
					(...args: any[]) => new Error(String(args[1]))
				)
		}

		mockSupabaseService = {
			getClient: jest.fn(() => ({
				functions: {
					invoke: jest.fn().mockImplementation(() =>
						Promise.resolve({
							data: { id: 'email-123' },
							error: null
						})
					)
				}
			}))
		}

		mockPrismaService = {
			maintenanceRequest: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
				findFirst: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn()
			}
		}

		service = new MaintenanceService(
			mockRepository,
			mockErrorHandler,
			mockSupabaseService,
			mockPrismaService
		)
	})

	describe('Basic CRUD Operations', () => {
		it('should create maintenance request successfully', async () => {
			const createData = {
				title: 'New Request',
				description: 'New description',
				priority: 'HIGH',
				unitId: 'unit-123'
			}
			mockRepository.create.mockResolvedValue(mockMaintenanceRequest)

			const result = await service.create(createData as any, 'owner-123')

			expect(mockRepository.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					title: 'New Request',
					description: 'New description',
					priority: 'HIGH',
					Unit: { connect: { id: 'unit-123' } }
				})
			})
			expect(result).toEqual(mockMaintenanceRequest)
		})

		it('should get maintenance request by ID', async () => {
			mockRepository.findByIdAndOwner.mockResolvedValue(
				mockMaintenanceRequest
			)

			const result = await service.getByIdOrThrow(
				'maint-123',
				'owner-123'
			)

			expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'maint-123',
				'owner-123'
			)
			expect(result).toEqual(mockMaintenanceRequest)
		})

		it('should throw NotFoundException when request not found', async () => {
			mockRepository.findByIdAndOwner.mockResolvedValue(null)

			await expect(
				service.getByIdOrThrow('nonexistent', 'owner-123')
			).rejects.toThrow(NotFoundException)
		})

		it('should update maintenance request', async () => {
			const updateData = { title: 'Updated Title' }
			mockRepository.findByIdAndOwner.mockResolvedValue(
				mockMaintenanceRequest
			)
			mockRepository.update.mockResolvedValue({
				...mockMaintenanceRequest,
				...updateData
			})

			const result = await service.update(
				'maint-123',
				updateData,
				'owner-123'
			)

			expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'maint-123',
				'owner-123'
			)
			expect(mockRepository.update).toHaveBeenCalledWith({
				where: expect.objectContaining({ id: 'maint-123' }),
				data: expect.objectContaining({
					title: 'Updated Title',
					updatedAt: expect.any(Date)
				})
			})
			expect(result.title).toBe('Updated Title')
		})

		it('should delete maintenance request', async () => {
			mockRepository.findByIdAndOwner.mockResolvedValue(
				mockMaintenanceRequest
			)
			mockRepository.delete.mockResolvedValue(mockMaintenanceRequest)

			const result = await service.delete('maint-123', 'owner-123')

			expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith(
				'maint-123',
				'owner-123'
			)
			expect(mockRepository.delete).toHaveBeenCalledWith({
				where: {
					id: 'maint-123',
					Unit: {
						Property: {
							ownerId: 'owner-123'
						}
					}
				}
			})
			expect(result).toEqual(mockMaintenanceRequest)
		})

		it('should get requests by owner', async () => {
			const mockRequests = [mockMaintenanceRequest]
			mockRepository.findManyByOwner.mockResolvedValue(mockRequests)

			const result = await service.getByOwner('owner-123')

			expect(mockRepository.findManyByOwner).toHaveBeenCalledWith(
				'owner-123',
				{}
			)
			expect(result).toEqual(mockRequests)
		})

		it('should get requests by unit', async () => {
			const mockRequests = [mockMaintenanceRequest]
			mockRepository.findByUnit.mockResolvedValue(mockRequests)

			const result = await service.getByUnit('unit-123', 'owner-123')

			expect(mockRepository.findByUnit).toHaveBeenCalledWith(
				'unit-123',
				'owner-123',
				undefined
			)
			expect(result).toEqual(mockRequests)
		})

		it('should get stats for owner', async () => {
			const mockStats = {
				totalRequests: 10,
				openRequests: 5,
				inProgressRequests: 3,
				completedRequests: 2
			}
			mockRepository.getStatsByOwner.mockResolvedValue(mockStats)

			const result = await service.getStats('owner-123')

			expect(mockRepository.getStatsByOwner).toHaveBeenCalledWith(
				'owner-123'
			)
			expect(result).toEqual(mockStats)
		})
	})

	describe('Date Handling', () => {
		it('should handle preferredDate string conversion', async () => {
			const createData = {
				title: 'Date Test',
				description: 'Testing date conversion',
				priority: 'MEDIUM',
				unitId: 'unit-123',
				preferredDate: '2024-12-15T10:00:00Z'
			}
			mockRepository.create.mockResolvedValue(mockMaintenanceRequest)

			await service.create(createData as any, 'owner-123')

			expect(mockRepository.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					preferredDate: new Date('2024-12-15T10:00:00Z')
				})
			})
		})

		it('should handle undefined preferredDate', async () => {
			const createData = {
				title: 'Date Test',
				description: 'Testing no date',
				priority: 'MEDIUM',
				unitId: 'unit-123'
			}
			mockRepository.create.mockResolvedValue(mockMaintenanceRequest)

			await service.create(createData as any, 'owner-123')

			expect(mockRepository.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					preferredDate: undefined
				})
			})
		})
	})

	describe('Error Handling', () => {
		it('should handle creation errors', async () => {
			const error = new Error('Creation failed')
			mockRepository.create.mockRejectedValue(error)

			await expect(
				service.create({} as any, 'owner-123')
			).rejects.toThrow('Creation failed')

			expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					operation: 'create',
					resource: 'maintenance-request',
					metadata: { ownerId: 'owner-123' }
				})
			)
		})

		it('should handle repository errors', async () => {
			const error = new Error('Database error')
			mockRepository.findManyByOwner.mockRejectedValue(error)

			await expect(service.getByOwner('owner-123')).rejects.toThrow(
				'Database error'
			)

			expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					operation: 'getByOwner',
					resource: 'maintenance-request',
					metadata: { ownerId: 'owner-123' }
				})
			)
		})
	})
})
