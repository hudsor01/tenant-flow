import { Test, TestingModule } from '@nestjs/testing'
import { AdminSystemController } from './admin-system.controller'
import { AdminService } from '../services/admin.service'
import { AppLogger } from '../../../logger/app-logger.service'
import type { Database } from '@repo/shared/types/supabase'

describe('AdminSystemController', () => {
	let controller: AdminSystemController
	let adminService: jest.Mocked<AdminService>
	let logger: jest.Mocked<AppLogger>

	const mockAdminService = {
		getMetrics: jest.fn(),
		getLogs: jest.fn(),
		getFailedJobs: jest.fn(),
		retryJob: jest.fn()
	}

	const mockLogger = {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn()
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminSystemController],
			providers: [
				{
					provide: AdminService,
					useValue: mockAdminService
				},
				{
					provide: AppLogger,
					useValue: mockLogger
				}
			]
		}).compile()

		controller = module.get<AdminSystemController>(AdminSystemController)
		adminService = module.get(AdminService)
		logger = module.get(AppLogger)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getHealth', () => {
		it('should return health status with metrics', async () => {
			const mockMetrics = {
				users: 150,
				properties: 75,
				leases: 120,
				subscriptions: 65,
				queues: {
					emails: {
						active: 2,
						completed: 1543,
						failed: 5,
						delayed: 0,
						waiting: 0
					},
					webhooks: {
						active: 0,
						completed: 892,
						failed: 1,
						delayed: 0,
						waiting: 0
					}
				}
			}

			adminService.getMetrics.mockResolvedValue(mockMetrics)

			const result = await controller.getHealth()

			expect(result).toMatchObject({
				status: 'healthy',
				database: {
					connected: true,
					users: 150,
					properties: 75
				},
				queues: {
					emails: mockMetrics.queues.emails,
					webhooks: mockMetrics.queues.webhooks
				}
			})
			expect(result.timestamp).toBeDefined()
			expect(adminService.getMetrics).toHaveBeenCalled()
		})
	})

	describe('getMetrics', () => {
		it('should return application metrics', async () => {
			const mockMetrics = {
				users: 150,
				properties: 75,
				leases: 120,
				subscriptions: 65,
				queues: {
					emails: {
						active: 2,
						completed: 1543,
						failed: 5,
						delayed: 0,
						waiting: 0
					},
					webhooks: {
						active: 0,
						completed: 892,
						failed: 1,
						delayed: 0,
						waiting: 0
					}
				}
			}

			adminService.getMetrics.mockResolvedValue(mockMetrics)

			const result = await controller.getMetrics()

			expect(result).toEqual(mockMetrics)
			expect(adminService.getMetrics).toHaveBeenCalled()
		})
	})

	describe('getLogs', () => {
		it('should return security logs with default parameters', async () => {
			const mockLogs = {
				logs: [
					{
						id: 'log-1',
						created_at: '2025-01-15T12:00:00Z',
						event_type: 'auth.login' as Database['public']['Enums']['security_event_type'],
						severity: 'info' as Database['public']['Enums']['security_event_severity'],
						user_id: 'user-1',
						message: 'User logged in successfully',
						ip_address: '192.168.1.1'
					}
				],
				total: 45,
				filters: {
					limit: 100,
					offset: 0
				}
			}

			adminService.getLogs.mockResolvedValue(mockLogs)

			const result = await controller.getLogs()

			expect(result).toEqual(mockLogs)
			expect(adminService.getLogs).toHaveBeenCalledWith({
				limit: 100,
				offset: 0
			})
		})

		it('should filter logs by severity level', async () => {
			const mockLogs = {
				logs: [],
				total: 5,
				filters: {
					level: 'error' as Database['public']['Enums']['security_event_severity'],
					limit: 100,
					offset: 0
				}
			}

			adminService.getLogs.mockResolvedValue(mockLogs)

			await controller.getLogs('error')

			expect(adminService.getLogs).toHaveBeenCalledWith({
				level: 'error',
				limit: 100,
				offset: 0
			})
		})

		it('should handle custom limit and offset', async () => {
			const mockLogs = {
				logs: [],
				total: 100,
				filters: {
					limit: 50,
					offset: 50
				}
			}

			adminService.getLogs.mockResolvedValue(mockLogs)

			await controller.getLogs(undefined, '50', '50')

			expect(adminService.getLogs).toHaveBeenCalledWith({
				limit: 50,
				offset: 50
			})
		})

		it('should cap limit at 500', async () => {
			const mockLogs = {
				logs: [],
				total: 1000,
				filters: {
					limit: 500,
					offset: 0
				}
			}

			adminService.getLogs.mockResolvedValue(mockLogs)

			await controller.getLogs(undefined, '1000', '0')

			expect(adminService.getLogs).toHaveBeenCalledWith({
				limit: 500, // Capped at 500
				offset: 0
			})
		})

		it('should handle all severity levels', async () => {
			const severityLevels: Array<
				Database['public']['Enums']['security_event_severity']
			> = ['debug', 'info', 'warning', 'error', 'critical']

			for (const level of severityLevels) {
				adminService.getLogs.mockResolvedValue({
					logs: [],
					total: 0,
					filters: { level, limit: 100, offset: 0 }
				})

				await controller.getLogs(level)

				expect(adminService.getLogs).toHaveBeenCalledWith({
					level,
					limit: 100,
					offset: 0
				})
			}

			expect(adminService.getLogs).toHaveBeenCalledTimes(severityLevels.length)
		})
	})

	describe('getFailedJobs', () => {
		it('should return failed jobs for all queues by default', async () => {
			const mockFailedJobs = {
				failedJobs: [
					{
						queueName: 'emails',
						jobs: [
							{
								id: '123',
								name: 'send-payment-success',
								data: {
									to: 'tenant@example.com',
									amount: 1200
								},
								failedReason: 'Connection timeout',
								attemptsMade: 3,
								timestamp: 1705320000000
							}
						]
					},
					{
						queueName: 'stripe-webhooks',
						jobs: []
					}
				]
			}

			adminService.getFailedJobs.mockResolvedValue(mockFailedJobs)

			const result = await controller.getFailedJobs()

			expect(result).toEqual(mockFailedJobs)
			expect(adminService.getFailedJobs).toHaveBeenCalledWith(undefined)
		})

		it('should filter by specific queue', async () => {
			const mockFailedJobs = {
				failedJobs: [
					{
						queueName: 'emails',
						jobs: [
							{
								id: '123',
								name: 'send-payment-failed',
								data: {},
								failedReason: 'Invalid email',
								attemptsMade: 3,
								timestamp: 1705320000000
							}
						]
					}
				]
			}

			adminService.getFailedJobs.mockResolvedValue(mockFailedJobs)

			const result = await controller.getFailedJobs('emails')

			expect(result).toEqual(mockFailedJobs)
			expect(adminService.getFailedJobs).toHaveBeenCalledWith('emails')
		})
	})

	describe('retryJob', () => {
		it('should retry a failed job', async () => {
			const mockResult = {
				success: true,
				jobId: '123',
				queueName: 'emails'
			}

			adminService.retryJob.mockResolvedValue(mockResult)

			const result = await controller.retryJob({
				queueName: 'emails',
				jobId: '123'
			})

			expect(result).toEqual(mockResult)
			expect(adminService.retryJob).toHaveBeenCalledWith('emails', '123')
			expect(logger.log).toHaveBeenCalledWith('Admin: Retrying job', {
				queueName: 'emails',
				jobId: '123'
			})
		})

		it('should handle retry errors', async () => {
			adminService.retryJob.mockRejectedValue(new Error('Job not found'))

			await expect(
				controller.retryJob({
					queueName: 'invalid',
					jobId: '999'
				})
			).rejects.toThrow('Job not found')

			expect(logger.log).toHaveBeenCalled()
		})
	})
})
