import { Test, TestingModule } from '@nestjs/testing'
import { AdminUsersController } from './admin-users.controller'
import { AdminService } from '../services/admin.service'
import { AppLogger } from '../../../logger/app-logger.service'

describe('AdminUsersController', () => {
	let controller: AdminUsersController
	let adminService: jest.Mocked<AdminService>
	let logger: jest.Mocked<AppLogger>

	const mockAdminService = {
		listUsers: jest.fn(),
		getUserDetails: jest.fn(),
		updateUser: jest.fn(),
		getUserActivity: jest.fn()
	}

	const mockLogger = {
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn()
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminUsersController],
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

		controller = module.get<AdminUsersController>(AdminUsersController)
		adminService = module.get(AdminService)
		logger = module.get(AppLogger)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('listUsers', () => {
		it('should return paginated users with default parameters', async () => {
			const mockResponse = {
				users: [
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
				],
				total: 1,
				page: 1,
				limit: 50,
				totalPages: 1
			}

			adminService.listUsers.mockResolvedValue(mockResponse)

			const result = await controller.listUsers()

			expect(result).toEqual(mockResponse)
			expect(adminService.listUsers).toHaveBeenCalledWith({
				page: 1,
				limit: 20
			})
		})

		it('should handle pagination parameters', async () => {
			const mockResponse = {
				users: [],
				total: 100,
				page: 2,
				limit: 25,
				totalPages: 4
			}

			adminService.listUsers.mockResolvedValue(mockResponse)

			await controller.listUsers('2', '25')

			expect(adminService.listUsers).toHaveBeenCalledWith({
				page: 2,
				limit: 25,
				role: undefined,
				search: undefined
			})
		})

		it('should handle role filter', async () => {
			const mockResponse = {
				users: [],
				total: 10,
				page: 1,
				limit: 50,
				totalPages: 1
			}

			adminService.listUsers.mockResolvedValue(mockResponse)

			await controller.listUsers('1', '50', 'ADMIN')

			expect(adminService.listUsers).toHaveBeenCalledWith({
				page: 1,
				limit: 50,
				role: 'ADMIN',
				search: undefined
			})
		})

		it('should handle search parameter', async () => {
			const mockResponse = {
				users: [],
				total: 5,
				page: 1,
				limit: 50,
				totalPages: 1
			}

			adminService.listUsers.mockResolvedValue(mockResponse)

			await controller.listUsers('1', '50', undefined, 'john')

			expect(adminService.listUsers).toHaveBeenCalledWith({
				page: 1,
				limit: 50,
				role: undefined,
				search: 'john'
			})
		})

		it('should limit maximum page size to 100', async () => {
			const mockResponse = {
				users: [],
				total: 1000,
				page: 1,
				limit: 100,
				totalPages: 10
			}

			adminService.listUsers.mockResolvedValue(mockResponse)

			await controller.listUsers('1', '1000')

			expect(adminService.listUsers).toHaveBeenCalledWith({
				page: 1,
				limit: 100 // Capped at 100
			})
		})
	})

	describe('getUserDetails', () => {
		it('should return user details with counts', async () => {
			const mockUser = {
				id: 'user-1',
				email: 'test@example.com',
				full_name: 'Test User',
				user_type: 'OWNER',
				status: 'active',
				propertiesCount: 5,
				leasesCount: 12,
				created_at: '2025-01-15T12:00:00Z'
			}

			adminService.getUserDetails.mockResolvedValue(mockUser)

			const result = await controller.getUserDetails('user-1')

			expect(result).toEqual(mockUser)
			expect(adminService.getUserDetails).toHaveBeenCalledWith('user-1')
		})

		it('should handle errors from service', async () => {
			adminService.getUserDetails.mockRejectedValue(new Error('User not found'))

			await expect(controller.getUserDetails('invalid-id')).rejects.toThrow(
				'User not found'
			)
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

			adminService.updateUser.mockResolvedValue(mockUpdatedUser)

			const result = await controller.updateUser('user-1', { role: 'ADMIN' })

			expect(result).toEqual(mockUpdatedUser)
			expect(adminService.updateUser).toHaveBeenCalledWith('user-1', {
				role: 'ADMIN'
			})
		})

		it('should update user status', async () => {
			const mockUpdatedUser = {
				id: 'user-1',
				email: 'test@example.com',
				user_type: 'OWNER',
				status: 'suspended'
			}

			adminService.updateUser.mockResolvedValue(mockUpdatedUser)

			const result = await controller.updateUser('user-1', {
				status: 'suspended'
			})

			expect(result).toEqual(mockUpdatedUser)
			expect(adminService.updateUser).toHaveBeenCalledWith('user-1', {
				status: 'suspended'
			})
		})

		it('should update both role and status', async () => {
			const mockUpdatedUser = {
				id: 'user-1',
				email: 'test@example.com',
				user_type: 'ADMIN',
				status: 'suspended'
			}

			adminService.updateUser.mockResolvedValue(mockUpdatedUser)

			await controller.updateUser('user-1', {
				role: 'ADMIN',
				status: 'suspended'
			})

			expect(adminService.updateUser).toHaveBeenCalledWith('user-1', {
				role: 'ADMIN',
				status: 'suspended'
			})
		})
	})

	describe('getUserActivity', () => {
		it('should return user activity with default limit', async () => {
			const mockActivity = {
				userId: 'user-1',
				activity: [
					{
						id: 'event-1',
						created_at: '2025-01-15T12:00:00Z',
						event_type: 'auth.login',
						severity: 'info',
						message: 'User logged in',
						ip_address: '192.168.1.1',
						user_agent: 'Mozilla/5.0...'
					}
				],
				count: 1
			}

			adminService.getUserActivity.mockResolvedValue(mockActivity)

			const result = await controller.getUserActivity('user-1')

			expect(result).toEqual(mockActivity)
			expect(adminService.getUserActivity).toHaveBeenCalledWith('user-1', 50)
		})

		it('should handle custom limit', async () => {
			const mockActivity = {
				userId: 'user-1',
				activity: [],
				count: 0
			}

			adminService.getUserActivity.mockResolvedValue(mockActivity)

			await controller.getUserActivity('user-1', '50')

			expect(adminService.getUserActivity).toHaveBeenCalledWith('user-1', 50)
		})

		it('should return empty activity array when no events', async () => {
			const mockActivity = {
				userId: 'user-1',
				activity: [],
				count: 0
			}

			adminService.getUserActivity.mockResolvedValue(mockActivity)

			const result = await controller.getUserActivity('user-1')

			expect(result.activity).toEqual([])
			expect(result.count).toBe(0)
		})
	})
})
