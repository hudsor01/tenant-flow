import { BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { REPOSITORY_TOKENS } from '../../repositories/repositories.module'
import { LeasesService } from './leases.service'

describe('LeasesService', () => {
	let service: LeasesService
	let mockLeasesRepository: any
	let mockEventEmitter: jest.Mocked<EventEmitter2>

	const generateUUID = () => randomUUID()

	const createMockLease = (overrides: Record<string, unknown> = {}) => ({
		id: generateUUID(),
		tenantId: generateUUID(),
		unitId: generateUUID(),
		propertyId: generateUUID(),
		startDate: '2024-01-01',
		endDate: '2024-12-31',
		monthlyRent: 1500.0,
		rentAmount: 1500.0,
		securityDeposit: 3000.0,
		paymentFrequency: 'MONTHLY',
		status: 'ACTIVE',
		terms: 'Standard lease terms',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	})

	beforeEach(async () => {
		mockLeasesRepository = {
			findByUserIdWithSearch: jest.fn(),
			findById: jest.fn(),
			findByPropertyId: jest.fn(),
			findByTenantId: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
			getStats: jest.fn(),
			getAnalytics: jest.fn(),
			getExpiringSoon: jest.fn(),
			getActiveLeases: jest.fn(),
			renewLease: jest.fn(),
			terminateLease: jest.fn(),
			getPaymentHistory: jest.fn()
		}

		mockEventEmitter = {
			emit: jest.fn(),
			emitAsync: jest.fn(),
			addListener: jest.fn(),
			on: jest.fn(),
			prependListener: jest.fn(),
			once: jest.fn(),
			prependOnceListener: jest.fn(),
			off: jest.fn(),
			removeListener: jest.fn(),
			removeAllListeners: jest.fn(),
			setMaxListeners: jest.fn(),
			getMaxListeners: jest.fn(),
			listeners: jest.fn(),
			rawListeners: jest.fn(),
			listenerCount: jest.fn(),
			eventNames: jest.fn(),
			onAny: jest.fn(),
			offAny: jest.fn(),
			many: jest.fn(),
			onceAny: jest.fn(),
			hasListeners: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeasesService,
				{
					provide: REPOSITORY_TOKENS.LEASES,
					useValue: mockLeasesRepository
				},
				{
					provide: EventEmitter2,
					useValue: mockEventEmitter
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<LeasesService>(LeasesService)

		// Spy on the actual logger instance created by the service
		jest.spyOn(service['logger'], 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Service Initialization', () => {
		it('should be defined', () => {
			expect(service).toBeDefined()
		})
	})

	describe('findAll', () => {
		it('should return all leases for user', async () => {
			const userId = generateUUID()
			const query = {
				tenantId: generateUUID(),
				propertyId: generateUUID(),
				status: 'ACTIVE',
				limit: 20,
				offset: 10,
				sortBy: 'startDate',
				sortOrder: 'asc'
			}
			const mockLeases = [createMockLease(), createMockLease()]

			mockLeasesRepository.findByUserIdWithSearch.mockResolvedValue(mockLeases)

			const result = await service.findAll(userId, query)

			expect(result).toEqual(mockLeases)
			expect(mockLeasesRepository.findByUserIdWithSearch).toHaveBeenCalledWith(
				userId,
				expect.objectContaining({
					search: undefined,
					propertyId: query.propertyId,
					tenantId: query.tenantId,
					status: query.status,
					startDate: undefined,
					endDate: undefined,
					limit: query.limit,
					offset: query.offset,
					sort: query.sortBy,
					order: query.sortOrder
				})
			)
		})

		it('should throw BadRequestException when userId is missing', async () => {
			const userId = ''
			const query = {}

			await expect(service.findAll(userId, query)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('getStats', () => {
		it('should return lease statistics response with computed fields', async () => {
			const userId = generateUUID()
			const mockStats = {
				total: 25,
				active: 20,
				expired: 3,
				expiringSoon: 4,
				expiringLeases: 5,
				terminated: 2,
				totalMonthlyRent: 55000,
				averageRent: 2750,
				totalSecurityDeposits: 12000
			}

			mockLeasesRepository.getStats.mockResolvedValue(mockStats)

			const result = await service.getStats(userId)

			expect(mockLeasesRepository.getStats).toHaveBeenCalledWith(userId)
			expect(result).toEqual({
				totalLeases: 25,
				activeLeases: 20,
				expiredLeases: 3,
				terminatedLeases: 2,
				totalMonthlyRent: 55000,
				averageRent: 2750,
				totalSecurityDeposits: 12000,
				expiringLeases: 5
			})
		})

		it('should throw BadRequestException when repository fails', async () => {
			const userId = generateUUID()
			const errorMessage = 'Stats calculation failed'

			mockLeasesRepository.getStats.mockRejectedValue(new Error(errorMessage))

			await expect(service.getStats(userId)).rejects.toThrow(
				BadRequestException
			)
			expect(service['logger'].error).toHaveBeenCalledWith(
				'Leases service failed to get stats',
				{
					error: errorMessage,
					userId
				}
			)
		})
	})
})
