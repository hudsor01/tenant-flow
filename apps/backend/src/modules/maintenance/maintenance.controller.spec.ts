import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Database } from '@repo/shared/types/supabase-generated'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { SupabaseService } from '../../database/supabase.service'
import {
	createMockMaintenanceRequest,
	createMockUser
} from '../../test-utils/mocks'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'

describe('MaintenanceController', () => {
	let controller: MaintenanceController
	let service: jest.Mocked<MaintenanceService>
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUser = createMockUser()
	const mockToken = 'mock-jwt-token'

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
			getUser: jest.fn().mockImplementation(req => Promise.resolve(req?.user))
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

		controller = module.get<MaintenanceController>(MaintenanceController)
		service = module.get(MaintenanceService) as jest.Mocked<MaintenanceService>
	})

	it('returns maintenance requests (findAll)', async () => {
		const requests = [createMockMaintenanceRequest()]
		service.findAll.mockResolvedValue(requests)
		const result = await controller.findAll(mockToken)
		expect(result).toEqual(requests)
		expect(service.findAll).toHaveBeenCalledWith(
			mockToken,
			expect.any(Object)
		)
	})

	it('returns single maintenance request (findOne)', async () => {
		const mockRequest = createMockMaintenanceRequest()
		service.findOne.mockResolvedValue(mockRequest)
		const result = await controller.findOne(mockRequest.id, mockToken)
		expect(result).toEqual(mockRequest)
	})

	it('throws NotFoundException when findOne not found', async () => {
		service.findOne.mockResolvedValue(null)
		await expect(
			controller.findOne(randomUUID(), mockToken)
		).rejects.toThrow(NotFoundException)
	})

	it('creates maintenance request (create)', async () => {
		const createData = {
			unitId: randomUUID(),
			title: 'New request',
			description: 'Fix',
			priority: 'MEDIUM' as const,
			category: 'GENERAL' as const
		}
		const mockMaintenanceRequest = createMockMaintenanceRequest()
		service.create.mockResolvedValue(mockMaintenanceRequest)
		const result = await controller.create(createData, mockToken, mockUser.id)
		expect(result).toEqual(mockMaintenanceRequest)
	})

	it('updates maintenance request (update)', async () => {
		const updated = { ...createMockMaintenanceRequest(), title: 'Updated' }
		service.update.mockResolvedValue(updated)
		const result = await controller.update(
			createMockMaintenanceRequest().id,
			{ title: 'Updated' },
			mockToken
		)
		expect(result).toEqual(updated)
	})

	it('throws NotFoundException when update not found', async () => {
		service.update.mockResolvedValue(null)
		await expect(
			controller.update(randomUUID(), {}, mockToken)
		).rejects.toThrow(NotFoundException)
	})

	it('removes maintenance request (remove)', async () => {
		const mockMaintenanceRequest = createMockMaintenanceRequest()
		service.remove.mockResolvedValue(undefined)
		await controller.remove(mockMaintenanceRequest.id, mockToken)
		expect(service.remove).toHaveBeenCalledWith(
			mockToken,
			mockMaintenanceRequest.id
		)
	})

	it('returns stats (getStats)', async () => {
		const stats = {
			total: 10,
			open: 3,
			inProgress: 2,
			completed: 5,
			completedToday: 1,
			avgResponseTimeHours: 12.5,
			byPriority: { low: 2, medium: 4, high: 3, emergency: 1 }
		}
		service.getStats.mockResolvedValue(stats as any)
		const result = await controller.getStats(mockToken)
		expect(result).toEqual(stats)
	})

	it('returns urgent and overdue', async () => {
		const urgent = [
			{
				...createMockMaintenanceRequest(),
				priority: 'URGENT' as Database['public']['Enums']['Priority']
			}
		]
		service.getUrgent.mockResolvedValue(urgent)
		const urgentResult = await controller.getUrgent(mockToken)
		expect(urgentResult).toEqual(urgent)

		const overdue = [
			{
				...createMockMaintenanceRequest(),
				status: 'ON_HOLD' as Database['public']['Enums']['RequestStatus']
			}
		]
		service.getOverdue.mockResolvedValue(overdue)
		const overdueResult = await controller.getOverdue(mockToken)
		expect(overdueResult).toEqual(overdue)
	})

	it('completes a request (complete)', async () => {
		const mockMaintenanceRequest = createMockMaintenanceRequest()
		const completed = {
			...mockMaintenanceRequest,
			status: 'COMPLETED' as Database['public']['Enums']['RequestStatus']
		}
		service.complete.mockResolvedValue(completed)
		const result = await controller.complete(
			mockMaintenanceRequest.id,
			mockToken,
			500,
			'Fixed'
		)
		expect(result).toEqual(completed)
		expect(service.complete).toHaveBeenCalledWith(
			mockToken,
			mockMaintenanceRequest.id,
			500,
			'Fixed'
		)
	})

	it('validates actualCost bounds in complete (rejects too low/high)', async () => {
		await expect(
			controller.complete(
				createMockMaintenanceRequest().id,
				mockToken,
				-1,
				undefined
			)
		).rejects.toThrow()
		await expect(
			controller.complete(
				createMockMaintenanceRequest().id,
				mockToken,
				1_000_000,
				undefined
			)
		).rejects.toThrow()
	})

	it('cancels a request (cancel)', async () => {
		const cancelled = {
			...createMockMaintenanceRequest(),
			status: 'CANCELED' as Database['public']['Enums']['RequestStatus']
		}
		service.cancel.mockResolvedValue(cancelled)
		const result = await controller.cancel(
			createMockMaintenanceRequest().id,
			mockToken,
			undefined
		)
		expect(result).toEqual(cancelled)
	})
})
