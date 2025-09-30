import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Request } from 'express'
import { SupabaseService } from '../database/supabase.service'
import { NotificationsController } from './notifications.controller'
import { createMockUser } from '../test-utils/mocks'

// Mock the SupabaseService
jest.mock('../database/supabase.service', () => {
	return {
		SupabaseService: jest.fn().mockImplementation(() => ({
			getUser: jest.fn(),
			getAdminClient: jest.fn(() => ({
				from: jest.fn()
			}))
		}))
	}
})

describe('NotificationsController', () => {
	let controller: NotificationsController
	let mockSupabaseServiceInstance: jest.Mocked<SupabaseService>
	let mockSupabaseClient: {
		from: jest.Mock
		select: jest.Mock
		insert: jest.Mock
		update: jest.Mock
		delete: jest.Mock
		eq: jest.Mock
		order: jest.Mock
		range: jest.Mock
		single: jest.Mock
	}

	const mockUser = createMockUser({ id: 'user-123' })

	const mockRequest = {} as Request

	beforeEach(async () => {
		jest.clearAllMocks()

		mockSupabaseClient = {
			from: jest.fn(() => mockSupabaseClient),
			select: jest.fn(() => mockSupabaseClient),
			insert: jest.fn(() => mockSupabaseClient),
			update: jest.fn(() => mockSupabaseClient),
			delete: jest.fn(() => mockSupabaseClient),
			eq: jest.fn(() => mockSupabaseClient),
			order: jest.fn(() => mockSupabaseClient),
			range: jest.fn(() => ({ data: [], error: null })),
			single: jest.fn(() => ({ data: {}, error: null }))
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [NotificationsController],
			providers: [SupabaseService]
		}).compile()

		controller = module.get<NotificationsController>(NotificationsController)
		mockSupabaseServiceInstance = module.get(
			SupabaseService
		) as jest.Mocked<SupabaseService>

		mockSupabaseServiceInstance.getAdminClient.mockReturnValue(mockSupabaseClient as any)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('getNotifications', () => {
		it('should return notifications for authenticated user', async () => {
			const mockNotifications = [
				{
					id: 'notif-1',
					title: 'Test Notification',
					content: 'Test content',
					type: 'maintenance',
					priority: 'MEDIUM',
					isRead: false,
					createdAt: new Date()
				}
			]

			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockSupabaseClient.range.mockReturnValue({
				data: mockNotifications,
				error: null
			})

			const result = await controller.getNotifications(mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('userId', mockUser.id)
			expect(result).toEqual({ notifications: mockNotifications })
		})

		it('should handle custom limit and offset parameters', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockSupabaseClient.range.mockReturnValue({ data: [], error: null })

			await controller.getNotifications(mockRequest, '20', '5')

			expect(mockSupabaseClient.range).toHaveBeenCalledWith(5, 24)
		})

		it('should throw UnauthorizedException when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)

			await expect(
				controller.getNotifications(mockRequest)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should throw BadRequestException when database query fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockSupabaseClient.range.mockReturnValue({
				data: null,
				error: { message: 'Database error' }
			})

			await expect(
				controller.getNotifications(mockRequest)
			).rejects.toThrow(BadRequestException)
		})

		it('should return empty array when no notifications found', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)
			mockSupabaseClient.range.mockReturnValue({ data: null, error: null })

			const result = await controller.getNotifications(mockRequest)

			expect(result).toEqual({ notifications: [] })
		})
	})

	describe('createNotification', () => {
		const validNotificationData = {
			userId: 'user-123',
			title: 'Test Notification',
			content: 'Test content',
			type: 'maintenance' as const,
			priority: 'MEDIUM' as const,
			actionUrl: '/test-url'
		}

		it('should create notification successfully', async () => {
			const mockCreatedNotification = {
				id: 'notif-123',
				...validNotificationData,
				isRead: false,
				createdAt: new Date()
			}

			mockSupabaseClient.single.mockResolvedValue({
				data: mockCreatedNotification,
				error: null
			})

			const result = await controller.createNotification(validNotificationData)

			expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
			expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
				...validNotificationData,
				isRead: false
			})
			expect(result).toEqual({ notification: mockCreatedNotification })
		})

		it('should create notification without optional actionUrl', async () => {
			const dataWithoutUrl = {
				userId: 'user-123',
				title: 'Test Notification',
				content: 'Test content',
				type: 'system' as const,
				priority: 'LOW' as const
			}

			mockSupabaseClient.single.mockResolvedValue({
				data: { ...dataWithoutUrl, id: 'notif-456' },
				error: null
			})

			const result = await controller.createNotification(dataWithoutUrl)

			expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
				...dataWithoutUrl,
				actionUrl: undefined,
				isRead: false
			})
			expect(result.notification).toBeDefined()
		})

		it('should throw BadRequestException when creation fails', async () => {
			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Creation failed' }
			})

			await expect(
				controller.createNotification(validNotificationData)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('markAsRead', () => {
		const notificationId = 'notif-123'

		it('should mark notification as read for authenticated user', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			// Set up the specific mock for this test
			const mockChain: any = {
				from: jest.fn(() => mockChain),
				update: jest.fn(() => mockChain),
				eq: jest.fn(() => mockChain)
			}

			// The final .eq() call should return { error: null }
			let callCount = 0
			mockChain.eq.mockImplementation((): any => {
				callCount++
				if (callCount === 2) {
					return { error: null }
				}
				return mockChain
			})

			mockSupabaseServiceInstance.getAdminClient.mockReturnValue(mockChain as any)

			const result = await controller.markAsRead(notificationId, mockRequest)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockChain.from).toHaveBeenCalledWith('notifications')
			expect(mockChain.update).toHaveBeenCalledWith({ isRead: true })
			expect(mockChain.eq).toHaveBeenCalledWith('id', notificationId)
			expect(mockChain.eq).toHaveBeenCalledWith('userId', mockUser.id)
			expect(result).toEqual({ success: true })
		})

		it('should throw UnauthorizedException when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)

			await expect(
				controller.markAsRead(notificationId, mockRequest)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should throw BadRequestException when update fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			// Set up the specific mock for error case
			const mockChain: any = {
				from: jest.fn(() => mockChain),
				update: jest.fn(() => mockChain),
				eq: jest.fn(() => mockChain)
			}

			// The final .eq() call should return an error
			let callCount = 0
			mockChain.eq.mockImplementation((): any => {
				callCount++
				if (callCount === 2) {
					return { error: { message: 'Update failed' } }
				}
				return mockChain
			})

			mockSupabaseServiceInstance.getAdminClient.mockReturnValue(mockChain as any)

			await expect(
				controller.markAsRead(notificationId, mockRequest)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('deleteNotification', () => {
		const notificationId = 'notif-123'

		it('should delete notification for authenticated user', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			// Set up the specific mock for this test
			const mockChain: any = {
				from: jest.fn(() => mockChain),
				delete: jest.fn(() => mockChain),
				eq: jest.fn(() => mockChain)
			}

			// The final .eq() call should return { error: null }
			let callCount = 0
			mockChain.eq.mockImplementation((): any => {
				callCount++
				if (callCount === 2) {
					return { error: null }
				}
				return mockChain
			})

			mockSupabaseServiceInstance.getAdminClient.mockReturnValue(mockChain as any)

			const result = await controller.deleteNotification(
				notificationId,
				mockRequest
			)

			expect(mockSupabaseServiceInstance.getUser).toHaveBeenCalledWith(
				mockRequest
			)
			expect(mockChain.from).toHaveBeenCalledWith('notifications')
			expect(mockChain.delete).toHaveBeenCalled()
			expect(mockChain.eq).toHaveBeenCalledWith('id', notificationId)
			expect(mockChain.eq).toHaveBeenCalledWith('userId', mockUser.id)
			expect(result).toEqual({ success: true })
		})

		it('should throw UnauthorizedException when user validation fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(null)

			await expect(
				controller.deleteNotification(notificationId, mockRequest)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should throw BadRequestException when deletion fails', async () => {
			mockSupabaseServiceInstance.getUser.mockResolvedValue(mockUser)

			// Set up the specific mock for error case
			const mockChain: any = {
				from: jest.fn(() => mockChain),
				delete: jest.fn(() => mockChain),
				eq: jest.fn(() => mockChain)
			}

			// The final .eq() call should return an error
			let callCount = 0
			mockChain.eq.mockImplementation((): any => {
				callCount++
				if (callCount === 2) {
					return { error: { message: 'Deletion failed' } }
				}
				return mockChain
			})

			mockSupabaseServiceInstance.getAdminClient.mockReturnValue(mockChain as any)

			await expect(
				controller.deleteNotification(notificationId, mockRequest)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('createMaintenanceNotification', () => {
		const maintenanceData = {
			userId: 'user-123',
			maintenanceId: 'maint-456',
			propertyName: 'Sunset Apartments',
			unitNumber: '2A'
		}

		it('should create maintenance notification with predefined content', async () => {
			const expectedNotification = {
				id: 'notif-789',
				userId: maintenanceData.userId,
				title: 'Maintenance Request Update',
				content: `Your maintenance request for ${maintenanceData.propertyName} Unit ${maintenanceData.unitNumber} has been updated.`,
				type: 'maintenance',
				priority: 'MEDIUM',
				actionUrl: `/maintenance/${maintenanceData.maintenanceId}`,
				isRead: false
			}

			mockSupabaseClient.single.mockResolvedValue({
				data: expectedNotification,
				error: null
			})

			const result = await controller.createMaintenanceNotification(
				maintenanceData
			)

			expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
				userId: maintenanceData.userId,
				title: 'Maintenance Request Update',
				content: `Your maintenance request for ${maintenanceData.propertyName} Unit ${maintenanceData.unitNumber} has been updated.`,
				type: 'maintenance',
				priority: 'MEDIUM',
				actionUrl: `/maintenance/${maintenanceData.maintenanceId}`,
				isRead: false
			})
			expect(result).toEqual({ notification: expectedNotification })
		})

		it('should throw BadRequestException when creation fails', async () => {
			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Creation failed' }
			})

			await expect(
				controller.createMaintenanceNotification(maintenanceData)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getPriorityInfo', () => {
		it('should return correct info for LOW priority', async () => {
			const result = await controller.getPriorityInfo('LOW')

			expect(result).toEqual({
				color: 'hsl(var(--muted-foreground))',
				label: 'Low Priority'
			})
		})

		it('should return correct info for MEDIUM priority', async () => {
			const result = await controller.getPriorityInfo('MEDIUM')

			expect(result).toEqual({
				color: '#FF9500',
				label: 'Medium Priority'
			})
		})

		it('should return correct info for HIGH priority', async () => {
			const result = await controller.getPriorityInfo('HIGH')

			expect(result).toEqual({
				color: 'hsl(var(--destructive))',
				label: 'High Priority'
			})
		})

		it('should return correct info for EMERGENCY priority', async () => {
			const result = await controller.getPriorityInfo('EMERGENCY')

			expect(result).toEqual({
				color: '#FF3B30',
				label: 'Emergency'
			})
		})

		it('should handle case insensitive priority input', async () => {
			const result = await controller.getPriorityInfo('low')

			expect(result).toEqual({
				color: 'hsl(var(--muted-foreground))',
				label: 'Low Priority'
			})
		})

		it('should throw BadRequestException for invalid priority', async () => {
			await expect(
				controller.getPriorityInfo('INVALID')
			).rejects.toThrow(BadRequestException)
		})
	})
})
