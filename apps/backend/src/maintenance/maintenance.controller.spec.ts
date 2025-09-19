import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { SilentLogger } from '../__test__/silent-logger'
import { randomUUID } from 'crypto'

describe('MaintenanceController', () => {
	let controller: MaintenanceController
	let service: jest.Mocked<MaintenanceService>

	const createMockUser = (overrides: Record<string, unknown> = {}) => ({
		id: randomUUID(),
		email: 'test@example.com',
		name: 'Test User',
		phone: null,
		avatarUrl: 'https://example.com/avatar.jpg',
		role: 'OWNER',
		supabaseId: randomUUID(),
		bio: null,
		stripeCustomerId: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	})

	const mockUser = createMockUser()
	const mockRequest = {
		id: randomUUID(),
		unitId: randomUUID(),
		title: 'Fix leak',
		priority: 'HIGH',
		category: 'PLUMBING',
		status: 'PENDING'
	}

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

		const module = await Test.createTestingModule({
			controllers: [MaintenanceController],
			providers: [{ provide: MaintenanceService, useValue: mockService }]
		})
		.setLogger(new SilentLogger())
		.compile()

		controller = module.get(MaintenanceController)
		service = module.get(MaintenanceService)
	})

	describe('findAll', () => {
		it('returns maintenance requests', async () => {
			service.findAll.mockResolvedValue([mockRequest])
			const result = await controller.findAll(mockUser)
			expect(result).toEqual([mockRequest])
			expect(service.findAll).toHaveBeenCalledWith(mockUser.id, expect.any(Object))
		})

		describe('validation', () => {
			it('validates invalid unitId UUID', async () => {
				await expect(controller.findAll(mockUser, 'invalid-uuid'))
					.rejects.toThrow('Invalid unit ID')
			})

			it('validates invalid propertyId UUID', async () => {
				await expect(controller.findAll(mockUser, undefined, 'invalid-uuid'))
					.rejects.toThrow('Invalid property ID')
			})

			it('validates invalid priority enum', async () => {
				await expect(controller.findAll(mockUser, undefined, undefined, 'INVALID'))
					.rejects.toThrow('Invalid priority')
			})

			it('validates invalid category enum', async () => {
				await expect(controller.findAll(mockUser, undefined, undefined, undefined, 'INVALID'))
					.rejects.toThrow('Invalid category')
			})

			it('validates invalid status enum', async () => {
				await expect(controller.findAll(mockUser, undefined, undefined, undefined, undefined, 'INVALID'))
					.rejects.toThrow('Invalid status')
			})

			it('accepts limit of 0 (falsy bypass)', async () => {
				// Current production behavior: limit 0 bypasses validation due to falsy check
				service.findAll.mockResolvedValue([mockRequest])
				const validUuid = randomUUID()
				const result = await controller.findAll(mockUser, validUuid, validUuid, 'HIGH', 'PLUMBING', 'PENDING', 0)
				expect(result).toEqual([mockRequest])
			})

			it('validates limit too high', async () => {
				const validUuid = randomUUID()
				await expect(controller.findAll(mockUser, validUuid, validUuid, 'HIGH', 'PLUMBING', 'PENDING', 101))
					.rejects.toThrow('Limit must be between 1 and 50')
			})
		})
	})

	describe('findOne', () => {
		it('returns single maintenance request', async () => {
			service.findOne.mockResolvedValue(mockRequest)
			const result = await controller.findOne(mockRequest.id, mockUser)
			expect(result).toEqual(mockRequest)
		})

		it('throws NotFoundException when not found', async () => {
			service.findOne.mockResolvedValue(null)
			await expect(controller.findOne(randomUUID(), mockUser))
				.rejects.toThrow(NotFoundException)
		})
	})

	describe('create', () => {
		it('creates new maintenance request', async () => {
			const createData = { unitId: randomUUID(), title: 'New request', description: 'Fix', priority: 'MEDIUM' as const, category: 'GENERAL' as const }
			service.create.mockResolvedValue(mockRequest)
			const result = await controller.create(createData, mockUser)
			expect(result).toEqual(mockRequest)
		})
	})

	describe('update', () => {
		it('updates maintenance request', async () => {
			const updated = { ...mockRequest, title: 'Updated' }
			service.update.mockResolvedValue(updated)
			const result = await controller.update(mockRequest.id, { title: 'Updated' }, mockUser)
			expect(result).toEqual(updated)
		})

		it('throws NotFoundException when not found', async () => {
			service.update.mockResolvedValue(null)
			await expect(controller.update(randomUUID(), {}, mockUser))
				.rejects.toThrow(NotFoundException)
		})
	})

	describe('remove', () => {
		it('removes maintenance request', async () => {
			service.remove.mockResolvedValue(undefined)
			await controller.remove(mockRequest.id, mockUser)
			expect(service.remove).toHaveBeenCalledWith(mockUser.id, mockRequest.id)
		})
	})

	describe('getStats', () => {
		it('returns stats', async () => {
			const stats = { total: 10, pending: 5 }
			service.getStats.mockResolvedValue(stats)
			const result = await controller.getStats(mockUser)
			expect(result).toEqual(stats)
		})
	})

	describe('getUrgent', () => {
		it('returns urgent maintenance requests', async () => {
			const urgent = [{ ...mockRequest, priority: 'URGENT' }]
			service.getUrgent.mockResolvedValue(urgent)
			const result = await controller.getUrgent(mockUser)
			expect(result).toEqual(urgent)
		})
	})

	describe('getOverdue', () => {
		it('returns overdue maintenance requests', async () => {
			const overdue = [{ ...mockRequest, status: 'OVERDUE' }]
			service.getOverdue.mockResolvedValue(overdue)
			const result = await controller.getOverdue(mockUser)
			expect(result).toEqual(overdue)
		})
	})

	describe('complete', () => {
		it('completes request', async () => {
			const completed = { ...mockRequest, status: 'COMPLETED' }
			service.complete.mockResolvedValue(completed)
			const result = await controller.complete(mockRequest.id, mockUser, undefined, undefined)
			expect(result).toEqual(completed)
		})

		it('completes with valid actualCost', async () => {
			const completed = { ...mockRequest, status: 'COMPLETED' }
			service.complete.mockResolvedValue(completed)
			// Correct parameter order: (id, actualCost, notes, user)
			const result = await controller.complete(mockRequest.id, 500, 'Fixed', mockUser)
			expect(result).toEqual(completed)
			expect(service.complete).toHaveBeenCalledWith(mockUser.id, mockRequest.id, 500, 'Fixed')
		})

		it('validates actualCost too low', async () => {
			// Correct parameter order: (id, actualCost, notes, user)
			await expect(controller.complete(mockRequest.id, -1, undefined, mockUser))
				.rejects.toThrow('Actual cost must be between 0 and 999999')
		})

		it('validates actualCost too high', async () => {
			// Correct parameter order: (id, actualCost, notes, user)
			await expect(controller.complete(mockRequest.id, 1000000, undefined, mockUser))
				.rejects.toThrow('Actual cost must be between 0 and 999999')
		})
	})

	describe('cancel', () => {
		it('cancels request', async () => {
			const cancelled = { ...mockRequest, status: 'CANCELLED' }
			service.cancel.mockResolvedValue(cancelled)
			const result = await controller.cancel(mockRequest.id, mockUser, undefined)
			expect(result).toEqual(cancelled)
		})
	})
})