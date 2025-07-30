import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LeasesService } from './leases.service'
import { LeaseRepository } from './lease.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto } from './dto'

// Mock the dependencies
const mockLeaseRepository = {
	findByOwner: vi.fn(),
	getStatsByOwner: vi.fn(),
	findByIdAndOwner: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	deleteById: vi.fn(),
	findByUnit: vi.fn(),
	findByTenant: vi.fn(),
	checkLeaseConflict: vi.fn()
} as unknown as vi.Mocked<LeaseRepository>

const mockErrorHandler = {
	handleErrorEnhanced: vi.fn()
} as unknown as vi.Mocked<ErrorHandlerService>

describe('LeasesService', () => {
	let service: LeasesService

	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetAllMocks()
		
		service = new LeasesService(mockLeaseRepository, mockErrorHandler)
	})

	describe('getByOwner', () => {
		const ownerId = 'owner-123'
		const mockLeases = [
			{
				id: 'lease-1',
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-12-31'),
				rentAmount: 1200,
				securityDeposit: 2400,
				status: 'ACTIVE'
			}
		]

		it('should return leases for a given owner', async () => {
			mockLeaseRepository.findByOwner.mockResolvedValue(mockLeases)

			const result = await service.getByOwner(ownerId)

			expect(mockLeaseRepository.findByOwner).toHaveBeenCalledWith(ownerId, undefined)
			expect(result).toEqual(mockLeases)
		})

		it('should pass query options to repository', async () => {
			const query = { status: 'ACTIVE' as any }
			mockLeaseRepository.findByOwner.mockResolvedValue(mockLeases)

			const result = await service.getByOwner(ownerId, query)

			expect(mockLeaseRepository.findByOwner).toHaveBeenCalledWith(ownerId, query)
			expect(result).toEqual(mockLeases)
		})

		it('should handle repository errors', async () => {
			const error = new Error('Database connection failed')
			mockLeaseRepository.findByOwner.mockRejectedValue(error)
			mockErrorHandler.handleErrorEnhanced.mockImplementation(() => { throw error })

			await expect(service.getByOwner(ownerId)).rejects.toThrow('Database connection failed')
			expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(error, {
				operation: 'getByOwner',
				resource: 'lease',
				metadata: { ownerId }
			})
		})
	})


	describe('create', () => {
		const ownerId = 'owner-123'
		const leaseData: CreateLeaseDto = {
			unitId: 'unit-123',
			tenantId: 'tenant-123',
			startDate: '2024-01-01',
			endDate: '2024-12-31',
			rentAmount: 1200,
			securityDeposit: 2400
		}
		const mockCreatedLease = {
			id: 'lease-new',
			...leaseData,
			startDate: new Date(leaseData.startDate),
			endDate: new Date(leaseData.endDate)
		}

		it('should create a new lease when no conflict exists', async () => {
			mockLeaseRepository.checkLeaseConflict.mockResolvedValue(false)
			mockLeaseRepository.create.mockResolvedValue(mockCreatedLease)

			const result = await service.create(leaseData, ownerId)

			expect(mockLeaseRepository.checkLeaseConflict).toHaveBeenCalledWith(
				leaseData.unitId,
				new Date(leaseData.startDate),
				new Date(leaseData.endDate)
			)
			expect(mockLeaseRepository.create).toHaveBeenCalledWith({
				data: {
					...leaseData,
					startDate: new Date(leaseData.startDate),
					endDate: new Date(leaseData.endDate)
				}
			})
			expect(result).toEqual(mockCreatedLease)
		})

		it('should throw error when dates are invalid', async () => {
			const invalidLeaseData = {
				...leaseData,
				startDate: '2024-12-31',
				endDate: '2024-01-01' // End before start
			}
			const error = new Error('Invalid lease dates')
			mockErrorHandler.handleErrorEnhanced.mockImplementation(() => { throw error })

			await expect(service.create(invalidLeaseData, ownerId)).rejects.toThrow('Invalid lease dates')
		})

		it('should throw error when lease conflict exists', async () => {
			mockLeaseRepository.checkLeaseConflict.mockResolvedValue(true)
			const error = new Error('Lease conflict')
			mockErrorHandler.handleErrorEnhanced.mockImplementation(() => { throw error })

			await expect(service.create(leaseData, ownerId)).rejects.toThrow('Lease conflict')
			expect(mockLeaseRepository.checkLeaseConflict).toHaveBeenCalled()
		})
	})

	describe('update', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-123'
		const existingLease = {
			id: leaseId,
			unitId: 'unit-123',
			startDate: new Date('2024-01-01'),
			endDate: new Date('2024-12-31')
		}
		const updateData: UpdateLeaseDto = {
			rentAmount: 1300
		}
		const mockUpdatedLease = {
			id: leaseId,
			...updateData
		}

		it('should update lease when owned by user', async () => {
			mockLeaseRepository.findByIdAndOwner.mockResolvedValue(existingLease)
			mockLeaseRepository.update.mockResolvedValue(mockUpdatedLease)

			const result = await service.update(leaseId, updateData, ownerId)

			expect(mockLeaseRepository.findByIdAndOwner).toHaveBeenCalledWith(leaseId, ownerId)
			expect(mockLeaseRepository.update).toHaveBeenCalledWith({
				where: { id: leaseId },
				data: {
					...updateData,
					startDate: undefined,
					endDate: undefined
				}
			})
			expect(result).toEqual(mockUpdatedLease)
		})

		it('should throw error when lease not found', async () => {
			mockLeaseRepository.findByIdAndOwner.mockResolvedValue(null)
			const error = new Error('Lease not found')
			mockErrorHandler.handleErrorEnhanced.mockImplementation(() => { throw error })

			await expect(service.update(leaseId, updateData, ownerId)).rejects.toThrow('Lease not found')
		})
	})

	describe('delete', () => {
		const leaseId = 'lease-123'
		const ownerId = 'owner-123'
		const mockLease = {
			id: leaseId,
			status: 'DRAFT'
		}

		it('should delete lease when owned by user', async () => {
			mockLeaseRepository.findByIdAndOwner.mockResolvedValue(mockLease)
			mockLeaseRepository.deleteById.mockResolvedValue({ id: leaseId })

			const result = await service.delete(leaseId, ownerId)

			expect(mockLeaseRepository.findByIdAndOwner).toHaveBeenCalledWith(leaseId, ownerId)
			expect(mockLeaseRepository.deleteById).toHaveBeenCalledWith(leaseId)
			expect(result).toEqual({ id: leaseId })
		})

		it('should throw error when lease not found', async () => {
			mockLeaseRepository.findByIdAndOwner.mockResolvedValue(null)
			const error = new Error('Lease not found')
			mockErrorHandler.handleErrorEnhanced.mockImplementation(() => { throw error })

			await expect(service.delete(leaseId, ownerId)).rejects.toThrow('Lease not found')
		})
	})

	describe('getStats', () => {
		const ownerId = 'owner-123'
		const mockStats = {
			totalLeases: 15,
			activeLeases: 10,
			draftLeases: 3,
			expiredLeases: 2,
			terminatedLeases: 0,
			expiringLeases: 5
		}

		it('should return lease statistics', async () => {
			mockLeaseRepository.getStatsByOwner.mockResolvedValue(mockStats)

			const result = await service.getStats(ownerId)

			expect(mockLeaseRepository.getStatsByOwner).toHaveBeenCalledWith(ownerId)
			expect(result).toEqual(mockStats)
		})
	})

	describe('getByUnit', () => {
		const unitId = 'unit-123'
		const ownerId = 'owner-123'
		const mockLeases = [{ id: 'lease-1' }]

		it('should return leases for a unit', async () => {
			mockLeaseRepository.findByUnit.mockResolvedValue(mockLeases)

			const result = await service.getByUnit(unitId, ownerId)

			expect(mockLeaseRepository.findByUnit).toHaveBeenCalledWith(unitId, ownerId, undefined)
			expect(result).toEqual(mockLeases)
		})
	})

	describe('getByTenant', () => {
		const tenantId = 'tenant-123'
		const ownerId = 'owner-123'
		const mockLeases = [{ id: 'lease-1' }]

		it('should return leases for a tenant', async () => {
			mockLeaseRepository.findByTenant.mockResolvedValue(mockLeases)

			const result = await service.getByTenant(tenantId, ownerId)

			expect(mockLeaseRepository.findByTenant).toHaveBeenCalledWith(tenantId, ownerId, undefined)
			expect(result).toEqual(mockLeases)
		})
	})
})