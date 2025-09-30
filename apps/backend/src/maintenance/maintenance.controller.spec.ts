import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase-generated'
import { randomUUID } from 'crypto'
import type { Request } from 'express'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { createMockUser, createMockMaintenanceRequest } from '../test-utils/mocks'

describe('MaintenanceController', () => {
	let controller: MaintenanceController
	let service: jest.Mocked<MaintenanceService>
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const createTestUser = (overrides: Partial<authUser> = {}): authUser =>
		createMockUser({
			id: randomUUID(),
			...overrides
		} as any)

	const mockUser = createMockUser()

	// Create mock request for tests
	const createMockRequest = (user?: authUser) =>
		({
			user,
			cookies: {
				'sb-bshjmbshupiibfiewpxb-auth-token': 'mock-auth-token'
			},
			headers: {},
			query: {},
			params: {},
			body: {}
		}) as unknown as Request



	beforeEach(async () => {
		const mockService = {
			findAll: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
			getStats: jest.fn(),
			getUrgent: jest.fn(),
			getOverdue: jest.fn(),
			complete: jest.fn(),
			cancel: jest.fn()
		}

		mockSupabaseService = {
			getUser: jest
				.fn()
				.mockImplementation(req => Promise.resolve(req.user))
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			controllers: [MaintenanceController],
			providers: [
				{ provide: MaintenanceService, useValue: mockService },
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		controller = module.get(MaintenanceController)
		service = module.get(MaintenanceService)
	})

	describe('findAll', () => {
		it('returns maintenance requests', async () => {
			const requests = [createMockMaintenanceRequest()]
			service.findAll.mockResolvedValue(requests)
			const result = await controller.findAll(createMockRequest())
			expect(result).toEqual(requests)
			expect(service.findAll).toHaveBeenCalledWith(
				'test-user-id',
				expect.any(Object)
			)
		})

		describe('validation', () => {
			it('validates invalid unitId UUID', async () => {
				await expect(
					controller.findAll(createMockRequest(), 'invalid-uuid')
				).rejects.toThrow('Invalid unit ID')
			})

			it('validates invalid propertyId UUID', async () => {
				await expect(
					controller.findAll(createMockRequest(), undefined, 'invalid-uuid')
				).rejects.toThrow('Invalid property ID')
			})

			it('validates invalid priority enum', async () => {
				await expect(
					controller.findAll(
						createMockRequest(),
						undefined,
						undefined,
						'INVALID'
					)
				).rejects.toThrow('Invalid priority')
			})

			it('validates invalid category enum', async () => {
				await expect(
					controller.findAll(
						createMockRequest(),
						undefined,
						undefined,
						undefined,
						'INVALID'
					)
				).rejects.toThrow('Invalid category')
			})

			it('validates invalid status enum', async () => {
				await expect(
					controller.findAll(
						createMockRequest(),
						undefined,
						undefined,
						undefined,
						undefined,
						'INVALID'
					)
				).rejects.toThrow('Invalid status')
			})

			it('accepts limit of 0 (falsy bypass)', async () => {
				// Current production behavior: limit 0 bypasses validation due to falsy check
				const requests = [createMockMaintenanceRequest()]
				service.findAll.mockResolvedValue(requests)
				const validUuid = randomUUID()
				const result = await controller.findAll(
					createMockRequest(),
					validUuid,
					validUuid,
					'HIGH',
					'PLUMBING',
					'OPEN',
					0
				)
				expect(result).toEqual(requests)
			})

			it('validates limit too high', async () => {
				const validUuid = randomUUID()
				await expect(
					controller.findAll(
						createMockRequest(),
						validUuid,
						validUuid,
						'HIGH',
						'PLUMBING',
						'OPEN',
						101
					)
				).rejects.toThrow('Limit must be between 1 and 50')
			})
		})
	})

	describe('findOne', () => {
		it('returns single maintenance request', async () => {
			const mockRequest = createMockMaintenanceRequest()
			service.findOne.mockResolvedValue(mockRequest)
			const result = await controller.findOne(
				mockRequest.id,
				createMockRequest(mockUser)
			)
			expect(result).toEqual(mockRequest)
		})

		it('throws NotFoundException when not found', async () => {
			service.findOne.mockResolvedValue(null)
			await expect(
				controller.findOne(randomUUID(), createMockRequest(mockUser))
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('creates new maintenance request', async () => {
			const createData = {
				unitId: randomUUID(),
				title: 'New request',
				description: 'Fix',
				priority: 'MEDIUM' as const,
				category: 'GENERAL' as const
			}
			const mockMaintenanceRequest = createMockMaintenanceRequest()
			service.create.mockResolvedValue(mockMaintenanceRequest)
			const result = await controller.create(
				createData,
				createMockRequest(mockUser)
			)
			expect(result).toEqual(mockMaintenanceRequest)
		})
	})

	describe('update', () => {
		it('updates maintenance request', async () => {
			const updated = { ...createMockMaintenanceRequest(), title: 'Updated' }
			service.update.mockResolvedValue(updated)
			const result = await controller.update(
				createMockMaintenanceRequest().id,
				{ title: 'Updated' },
				createMockRequest(mockUser)
			)
			expect(result).toEqual(updated)
		})

		it('throws NotFoundException when not found', async () => {
			service.update.mockResolvedValue(null)
			await expect(
				controller.update(randomUUID(), {}, createMockRequest(mockUser))
			).rejects.toThrow(NotFoundException)
		})
	})

	describe('remove', () => {
		it('removes maintenance request', async () => {
			const mockMaintenanceRequest = createMockMaintenanceRequest()
			service.remove.mockResolvedValue(undefined)
			await controller.remove(
				mockMaintenanceRequest.id,
				createMockRequest(mockUser)
			)
			expect(service.remove).toHaveBeenCalledWith(
				mockUser.id,
				mockMaintenanceRequest.id
			)
		})
	})

	describe('getStats', () => {
		it('returns stats', async () => {
			const stats = {
				total: 10,
				open: 3,
				inProgress: 2,
				completed: 5,
				completedToday: 1,
				avgResolutionTime: 24,
				byPriority: {
					low: 2,
					medium: 4,
					high: 3,
					emergency: 1
				}
			}
			service.getStats.mockResolvedValue(stats)
			const result = await controller.getStats(createMockRequest(mockUser))
			expect(result).toEqual(stats)
		})
	})

	describe('getUrgent', () => {
		it('returns urgent maintenance requests', async () => {
			const urgent = [{ ...createMockMaintenanceRequest(), priority: 'EMERGENCY' as Database['public']['Enums']['Priority'] }]
			service.getUrgent.mockResolvedValue(urgent)
			const result = await controller.getUrgent(createMockRequest(mockUser))
			expect(result).toEqual(urgent)
		})
	})

	describe('getOverdue', () => {
		it('returns overdue maintenance requests', async () => {
			const overdue = [{ ...createMockMaintenanceRequest(), status: 'ON_HOLD' as Database['public']['Enums']['RequestStatus'] }]
			service.getOverdue.mockResolvedValue(overdue)
			const result = await controller.getOverdue(createMockRequest(mockUser))
			expect(result).toEqual(overdue)
		})
	})

	describe('complete', () => {
		it('completes request', async () => {
			const completed = { ...createMockMaintenanceRequest(), status: 'COMPLETED' as Database['public']['Enums']['RequestStatus'] }
			service.complete.mockResolvedValue(completed)
			const result = await controller.complete(
				createMockMaintenanceRequest().id,
				createMockRequest(mockUser),
				undefined,
				undefined
			)
			expect(result).toEqual(completed)
		})

		it('completes with valid actualCost', async () => {
			const mockMaintenanceRequest = createMockMaintenanceRequest()
			const completed = { ...mockMaintenanceRequest, status: 'COMPLETED' as Database['public']['Enums']['RequestStatus'] }
			service.complete.mockResolvedValue(completed)
			// Correct parameter order: (id, request, actualCost, notes)
			const result = await controller.complete(
				mockMaintenanceRequest.id,
				createMockRequest(mockUser),
				500,
				'Fixed'
			)
			expect(result).toEqual(completed)
			expect(service.complete).toHaveBeenCalledWith(
				mockUser.id,
				mockMaintenanceRequest.id,
				500,
				'Fixed'
			)
		})

		it('validates actualCost too low', async () => {
			// Correct parameter order: (id, request, actualCost, notes)
			await expect(
				controller.complete(
					createMockMaintenanceRequest().id,
					createMockRequest(mockUser),
					-1,
					undefined
				)
			).rejects.toThrow('Actual cost must be between 0 and 999999')
		})

		it('validates actualCost too high', async () => {
			// Correct parameter order: (id, request, actualCost, notes)
			await expect(
				controller.complete(
					createMockMaintenanceRequest().id,
					createMockRequest(mockUser),
					1000000,
					undefined
				)
			).rejects.toThrow('Actual cost must be between 0 and 999999')
		})
	})

	describe('cancel', () => {
		it('cancels request', async () => {
			const cancelled = { ...createMockMaintenanceRequest(), status: 'CANCELED' as Database['public']['Enums']['RequestStatus'] }
			service.cancel.mockResolvedValue(cancelled)
			const result = await controller.cancel(
				createMockMaintenanceRequest().id,
				createMockRequest(mockUser),
				undefined
			)
			expect(result).toEqual(cancelled)
		})
	})
})
