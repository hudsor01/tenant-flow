import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomUUID } from 'crypto'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import {
	createMockMaintenanceRequest,
	createMockUser
} from '../../test-utils/mocks'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceReportingService } from './maintenance-reporting.service'
import { MaintenanceWorkflowService } from './maintenance-workflow.service'

describe('MaintenanceController', () => {
	let controller: MaintenanceController
	let service: jest.Mocked<MaintenanceService>
	let reportingService: jest.Mocked<MaintenanceReportingService>
	let workflowService: jest.Mocked<MaintenanceWorkflowService>
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUser = createMockUser()
	const mockToken = 'mock-jwt-token'

	beforeEach(async () => {
		const mockService = {
			findAll: jest.fn(),
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn()
		}

		const mockReportingService = {
			getStats: jest.fn(),
			getUrgent: jest.fn(),
			getOverdue: jest.fn()
		}

		const mockWorkflowService = {
			updateStatus: jest.fn(),
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
				{ provide: MaintenanceReportingService, useValue: mockReportingService },
				{ provide: MaintenanceWorkflowService, useValue: mockWorkflowService },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		controller = module.get<MaintenanceController>(MaintenanceController)
		service = module.get(MaintenanceService) as jest.Mocked<MaintenanceService>
		reportingService = module.get(MaintenanceReportingService) as jest.Mocked<MaintenanceReportingService>
		workflowService = module.get(MaintenanceWorkflowService) as jest.Mocked<MaintenanceWorkflowService>
	})

	it('returns maintenance requests (findAll)', async () => {
		const requests = [createMockMaintenanceRequest()]
		service.findAll.mockResolvedValue(requests)
		const result = await controller.findAll(mockToken)
		// Controller wraps service response in PaginatedResponse format
		expect(result).toEqual({
			data: requests,
			total: requests.length,
			limit: 10,
			offset: 0,
			hasMore: false
		})
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
		service.findOne.mockImplementation(() => Promise.resolve(null))
		await expect(
			controller.findOne(randomUUID(), mockToken)
		).rejects.toThrow(NotFoundException)
	})

	it('creates maintenance request (create)', async () => {
		const created_ata = {
			unit_id: randomUUID(),
			tenant_id: randomUUID(),
			title: 'Repair Request',
			description: 'Fix',
			priority: 'MEDIUM' as const,
			category: 'GENERAL' as const,
			status: 'pending' as const
		}
		const mockMaintenanceRequest = createMockMaintenanceRequest()
		service.create.mockResolvedValue(mockMaintenanceRequest)
		const result = await controller.create(created_ata, mockToken, mockUser.id)
		expect(result).toEqual(mockMaintenanceRequest)
	})

	it('updates maintenance request (update)', async () => {
		const updated = { ...createMockMaintenanceRequest(), description: 'Updated description' }
		service.update.mockResolvedValue(updated)
		const result = await controller.update(
			createMockMaintenanceRequest().id,
			{ description: 'Updated description' },
			mockToken
		)
		expect(result).toEqual(updated)
	})

	it('throws NotFoundException when update not found', async () => {
		service.update.mockImplementation(() => Promise.resolve(null))
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
		reportingService.getStats.mockResolvedValue(stats as any)
		const result = await controller.getStats(mockToken)
		expect(result).toEqual(stats)
	})

	it('returns urgent and overdue', async () => {
		const urgent = [
			{
				...createMockMaintenanceRequest(),
				priority: 'urgent'
			}
		]
		reportingService.getUrgent.mockResolvedValue(urgent)
		const urgentResult = await controller.getUrgent(mockToken)
		expect(urgentResult).toEqual(urgent)

		const overdue = [
			{
				...createMockMaintenanceRequest(),
				status: 'open'
			}
		]
		reportingService.getOverdue.mockResolvedValue(overdue)
		const overdueResult = await controller.getOverdue(mockToken)
		expect(overdueResult).toEqual(overdue)
	})

	it('completes a request (complete)', async () => {
		const mockMaintenanceRequest = createMockMaintenanceRequest()
		const completed = {
			...mockMaintenanceRequest,
			status: 'completed'
		}
		workflowService.complete.mockResolvedValue(completed)
		const result = await controller.complete(
			mockMaintenanceRequest.id,
			mockToken,
			500,
			'Fixed'
		)
		expect(result).toEqual(completed)
		expect(workflowService.complete).toHaveBeenCalledWith(
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
			status: 'cancelled'
		}
		workflowService.cancel.mockResolvedValue(cancelled)
		const result = await controller.cancel(
			createMockMaintenanceRequest().id,
			mockToken,
			undefined
		)
		expect(result).toEqual(cancelled)
	})
})
