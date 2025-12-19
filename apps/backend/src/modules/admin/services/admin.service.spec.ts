import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import { AdminService } from './admin.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import type { Queue, Job } from 'bullmq'

describe('AdminService', () => {
	let service: AdminService
	let supabaseService: jest.Mocked<SupabaseService>
	let emailQueue: jest.Mocked<Queue>
	let webhookQueue: jest.Mocked<Queue>
	let logger: jest.Mocked<AppLogger>

	// Mock Supabase client with chainable query builder
	const createMockSupabaseClient = (mockData = { data: [], error: null, count: 0 }) => {
		const queryBuilder = {
			select: jest.fn().mockReturnThis(),
			from: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			or: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			range: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue(mockData),
			update: jest.fn().mockReturnThis()
		}

		// Add promise-like behavior
		;(queryBuilder as any).then = function (
			onFulfilled: (value: any) => any,
			onRejected?: (reason: any) => any
		) {
			return Promise.resolve(mockData).then(onFulfilled, onRejected)
		}

		return queryBuilder
	}

	const mockSupabaseService = {
		getAdminClient: jest.fn()
	}

	const mockEmailQueue = {
		getJobCounts: jest.fn(),
		getFailed: jest.fn(),
		getJob: jest.fn()
	}

	const mockWebhookQueue = {
		getJobCounts: jest.fn(),
		getFailed: jest.fn(),
		getJob: jest.fn()
	}

	const mockLogger = {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn()
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: getQueueToken('emails'),
					useValue: mockEmailQueue
				},
				{
					provide: getQueueToken('stripe-webhooks'),
					useValue: mockWebhookQueue
				},
				{
					provide: AppLogger,
					useValue: mockLogger
				}
			]
		}).compile()

		service = module.get<AdminService>(AdminService)
		supabaseService = module.get(SupabaseService)
		emailQueue = module.get(getQueueToken('emails'))
		webhookQueue = module.get(getQueueToken('stripe-webhooks'))
		logger = module.get(AppLogger)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getMetrics', () => {
		it('should return application metrics', async () => {
			// Create separate mock clients for each query
			const usersClient = createMockSupabaseClient({ data: null, error: null, count: 150 })
			const propertiesClient = createMockSupabaseClient({ data: null, error: null, count: 75 })
			const leasesClient = createMockSupabaseClient({ data: null, error: null, count: 120 })
			const subscriptionsClient = createMockSupabaseClient({ data: null, error: null, count: 65 })

			// Mock getAdminClient to return the same client (queries are chained)
			const mockClient = createMockSupabaseClient()
			let callCount = 0
			mockClient.from = jest.fn().mockImplementation((table: string) => {
				callCount++
				if (table === 'users') return usersClient
				if (table === 'properties') return propertiesClient
				if (table === 'leases') return leasesClient
				if (table === 'subscriptions') return subscriptionsClient
				return mockClient
			})

			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			mockEmailQueue.getJobCounts.mockResolvedValue({
				active: 2,
				completed: 1543,
				failed: 5,
				delayed: 0,
				waiting: 0
			})

			mockWebhookQueue.getJobCounts.mockResolvedValue({
				active: 0,
				completed: 892,
				failed: 1,
				delayed: 0,
				waiting: 0
			})

			const result = await service.getMetrics()

			expect(result).toEqual({
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
			})

			expect(emailQueue.getJobCounts).toHaveBeenCalled()
			expect(webhookQueue.getJobCounts).toHaveBeenCalled()
		})

		it('should handle null counts gracefully', async () => {
			// Create mock clients with null counts
			const nullClient = createMockSupabaseClient({ data: null, error: null, count: null })

			const mockClient = createMockSupabaseClient()
			mockClient.from = jest.fn().mockReturnValue(nullClient)

			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			mockEmailQueue.getJobCounts.mockResolvedValue({
				active: 0,
				completed: 0,
				failed: 0,
				delayed: 0,
				waiting: 0
			})

			mockWebhookQueue.getJobCounts.mockResolvedValue({
				active: 0,
				completed: 0,
				failed: 0,
				delayed: 0,
				waiting: 0
			})

			const result = await service.getMetrics()

			expect(result.users).toBe(0)
			expect(result.properties).toBe(0)
			expect(result.leases).toBe(0)
			expect(result.subscriptions).toBe(0)
		})
	})

	describe('listUsers', () => {
		it('should list users with pagination', async () => {
			const mockUsers = [
				{
					id: 'user-1',
					email: 'test@example.com',
					full_name: 'Test User',
					user_type: 'OWNER',
					status: 'active',
					created_at: '2025-01-15T12:00:00Z',
					onboarding_status: 'complete',
					stripe_customer_id: 'cus_123'
				}
			]

			const mockClient = createMockSupabaseClient({
				data: mockUsers,
				error: null,
				count: 150
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			const result = await service.listUsers({
				page: 1,
				limit: 50
			})

			expect(result).toEqual({
				users: mockUsers,
				total: 150,
				page: 1,
				limit: 50,
				totalPages: 3
			})

			expect(mockClient.from).toHaveBeenCalledWith('users')
			expect(mockClient.select).toHaveBeenCalled()
			expect(mockClient.order).toHaveBeenCalledWith('created_at', {
				ascending: false
			})
			expect(mockClient.range).toHaveBeenCalledWith(0, 49)
		})

		it('should filter by role', async () => {
			const mockClient = createMockSupabaseClient({
				data: [],
				error: null,
				count: 10
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await service.listUsers({
				page: 1,
				limit: 50,
				role: 'ADMIN'
			})

			expect(mockClient.eq).toHaveBeenCalledWith('user_type', 'ADMIN')
		})

		it('should filter by search term', async () => {
			const mockClient = createMockSupabaseClient({
				data: [],
				error: null,
				count: 5
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await service.listUsers({
				page: 1,
				limit: 50,
				search: 'john@example.com'
			})

			expect(mockClient.or).toHaveBeenCalledWith(
				'email.ilike.%john@example.com%,full_name.ilike.%john@example.com%'
			)
		})

		it('should sanitize search input', async () => {
			const mockClient = createMockSupabaseClient({
				data: [],
				error: null,
				count: 0
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await service.listUsers({
				page: 1,
				limit: 50,
				search: 'test(user),'
			})

			// Should remove parentheses and commas
			expect(mockClient.or).toHaveBeenCalledWith(
				'email.ilike.%testuser%,full_name.ilike.%testuser%'
			)
		})

		it('should handle errors', async () => {
			const mockError = new Error('Database error')
			const mockClient = createMockSupabaseClient({
				data: null,
				error: mockError,
				count: null
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await expect(
				service.listUsers({
					page: 1,
					limit: 50
				})
			).rejects.toThrow('Database error')

			expect(logger.error).toHaveBeenCalledWith('Failed to list users', {
				error: mockError
			})
		})
	})

	describe('getUserDetails', () => {
		it('should return user details with property and lease counts', async () => {
			const mockUser = {
				id: 'user-1',
				email: 'test@example.com',
				full_name: 'Test User',
				user_type: 'OWNER',
				status: 'active',
				created_at: '2025-01-15T12:00:00Z'
			}

			// Create separate clients for each query
			const userClient = createMockSupabaseClient({ data: mockUser, error: null, count: null })
			userClient.single = jest.fn().mockResolvedValue({ data: mockUser, error: null, count: null })

			const propertiesClient = createMockSupabaseClient({ data: null, error: null, count: 5 })
			const leasesClient = createMockSupabaseClient({ data: null, error: null, count: 12 })

			const mockClient = createMockSupabaseClient()
			let queryCount = 0
			mockClient.from = jest.fn().mockImplementation((table: string) => {
				queryCount++
				if (queryCount === 1) return userClient  // User query
				if (queryCount === 2) return propertiesClient  // Properties count
				if (queryCount === 3) return leasesClient  // Leases count
				return mockClient
			})

			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			const result = await service.getUserDetails('user-1')

			expect(result).toEqual({
				...mockUser,
				propertiesCount: 5,
				leasesCount: 12
			})
		})

		it('should handle errors', async () => {
			const mockError = new Error('User not found')
			const mockClient = createMockSupabaseClient({ data: null, error: mockError, count: null })
			mockClient.single = jest.fn().mockResolvedValue({ data: null, error: mockError, count: null })
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await expect(service.getUserDetails('invalid-id')).rejects.toThrow(
				'User not found'
			)

			expect(logger.error).toHaveBeenCalledWith('Failed to get user details', {
				error: mockError,
				userId: 'invalid-id'
			})
		})
	})

	describe('updateUser', () => {
		it('should update user role', async () => {
			const mockUpdatedUser = {
				id: 'user-1',
				email: 'test@example.com',
				user_type: 'ADMIN',
				status: 'active'
			}

			const mockClient = createMockSupabaseClient({ data: mockUpdatedUser, error: null, count: null })
			mockClient.single = jest.fn().mockResolvedValue({ data: mockUpdatedUser, error: null, count: null })
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			const result = await service.updateUser('user-1', { role: 'ADMIN' })

			expect(result).toEqual(mockUpdatedUser)
			expect(mockClient.update).toHaveBeenCalledWith({ user_type: 'ADMIN' })
			expect(logger.log).toHaveBeenCalledWith('User updated successfully', {
				userId: 'user-1',
				updates: { role: 'ADMIN' }
			})
		})

		it('should update user status', async () => {
			const mockUpdatedUser = {
				id: 'user-1',
				status: 'suspended'
			}

			const mockClient = createMockSupabaseClient({ data: mockUpdatedUser, error: null, count: null })
			mockClient.single = jest.fn().mockResolvedValue({ data: mockUpdatedUser, error: null, count: null })
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await service.updateUser('user-1', { status: 'suspended' })

			expect(mockClient.update).toHaveBeenCalledWith({ status: 'suspended' })
		})

		it('should handle errors', async () => {
			const mockError = new Error('Update failed')
			const mockClient = createMockSupabaseClient({ data: null, error: mockError, count: null })
			mockClient.single = jest.fn().mockResolvedValue({ data: null, error: mockError, count: null })
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await expect(
				service.updateUser('user-1', { role: 'ADMIN' })
			).rejects.toThrow('Update failed')

			expect(logger.error).toHaveBeenCalledWith('Failed to update user', {
				error: mockError,
				userId: 'user-1',
				updates: { role: 'ADMIN' }
			})
		})
	})

	describe('getLogs', () => {
		it('should return security logs', async () => {
			const mockLogs = [
				{
					id: 'log-1',
					created_at: '2025-01-15T12:00:00Z',
					event_type: 'auth.login',
					severity: 'info',
					message: 'User logged in'
				}
			]

			const mockClient = createMockSupabaseClient({
				data: mockLogs,
				error: null,
				count: 45
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			const result = await service.getLogs({
				limit: 100,
				offset: 0
			})

			expect(result).toEqual({
				logs: mockLogs,
				total: 45,
				filters: {
					limit: 100,
					offset: 0
				}
			})

			expect(mockClient.from).toHaveBeenCalledWith('security_events')
		})

		it('should filter by severity level', async () => {
			const mockClient = createMockSupabaseClient({
				data: [],
				error: null,
				count: 0
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			await service.getLogs({
				level: 'error',
				limit: 100,
				offset: 0
			})

			expect(mockClient.eq).toHaveBeenCalledWith('severity', 'error')
		})
	})

	describe('getUserActivity', () => {
		it('should return user activity log', async () => {
			const mockActivity = [
				{
					id: 'event-1',
					created_at: '2025-01-15T12:00:00Z',
					event_type: 'auth.login',
					severity: 'info',
					message: 'User logged in'
				}
			]

			const mockClient = createMockSupabaseClient({
				data: mockActivity,
				error: null,
				count: 1
			})
			mockSupabaseService.getAdminClient.mockReturnValue(mockClient as any)

			const result = await service.getUserActivity('user-1', 100)

			expect(result).toEqual({
				userId: 'user-1',
				activity: mockActivity,
				count: 1
			})

			expect(mockClient.eq).toHaveBeenCalledWith('user_id', 'user-1')
			expect(mockClient.limit).toHaveBeenCalledWith(100)
		})
	})

	describe('getFailedJobs', () => {
		it('should return failed jobs from all queues', async () => {
			const mockEmailJob = {
				id: '123',
				name: 'send-email',
				data: { to: 'test@example.com' },
				failedReason: 'Connection timeout',
				attemptsMade: 3,
				timestamp: 1705320000000
			} as unknown as Job

			mockEmailQueue.getFailed.mockResolvedValue([mockEmailJob])
			mockWebhookQueue.getFailed.mockResolvedValue([])

			const result = await service.getFailedJobs()

			expect(result).toEqual({
				failedJobs: [
					{
						queueName: 'emails',
						jobs: [
							{
								id: '123',
								name: 'send-email',
								data: { to: 'test@example.com' },
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
			})

			expect(emailQueue.getFailed).toHaveBeenCalledWith(0, 100)
			expect(webhookQueue.getFailed).toHaveBeenCalledWith(0, 100)
		})

		it('should filter by specific queue', async () => {
			const mockEmailJob = {
				id: '123',
				name: 'send-email',
				data: {},
				failedReason: 'Error',
				attemptsMade: 3,
				timestamp: 1705320000000
			} as unknown as Job

			mockEmailQueue.getFailed.mockResolvedValue([mockEmailJob])

			const result = await service.getFailedJobs('emails')

			expect(result.failedJobs).toHaveLength(1)
			expect(result.failedJobs[0].queueName).toBe('emails')
			expect(emailQueue.getFailed).toHaveBeenCalled()
			expect(webhookQueue.getFailed).not.toHaveBeenCalled()
		})
	})

	describe('retryJob', () => {
		it('should retry a failed job', async () => {
			const mockJob = {
				retry: jest.fn().mockResolvedValue(undefined)
			} as unknown as Job

			mockEmailQueue.getJob.mockResolvedValue(mockJob)

			const result = await service.retryJob('emails', '123')

			expect(result).toEqual({
				success: true,
				jobId: '123',
				queueName: 'emails'
			})

			expect(emailQueue.getJob).toHaveBeenCalledWith('123')
			expect(mockJob.retry).toHaveBeenCalled()
			expect(logger.log).toHaveBeenCalledWith('Job retried', {
				queueName: 'emails',
				jobId: '123'
			})
		})

		it('should throw error for invalid queue', async () => {
			await expect(service.retryJob('invalid-queue', '123')).rejects.toThrow(
				'Queue invalid-queue not found'
			)
		})

		it('should throw error for non-existent job', async () => {
			mockEmailQueue.getJob.mockResolvedValue(null)

			await expect(service.retryJob('emails', '999')).rejects.toThrow(
				'Job 999 not found in queue emails'
			)
		})
	})
})
