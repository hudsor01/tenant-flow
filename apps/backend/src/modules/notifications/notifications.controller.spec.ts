import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { NotificationsController } from './notifications.controller'

describe('NotificationsController', () => {
	let controller: NotificationsController
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockSupabaseClient: {
		from: jest.Mock
		select: jest.Mock
		insert: jest.Mock
		update: jest.Mock
		delete: jest.Mock
		eq: jest.Mock
		in: jest.Mock
		order: jest.Mock
		range: jest.Mock
		single: jest.Mock
	}

	const mockUserId = 'user-123'
	const mockToken = 'valid-jwt-token'

	// Helper to create authenticated request with token
	const createAuthenticatedRequest = (
		overrides?: Partial<AuthenticatedRequest>
	): AuthenticatedRequest =>
		({
			user: { id: mockUserId },
			headers: {
				authorization: `Bearer ${mockToken}`
			},
			...overrides
		}) as unknown as AuthenticatedRequest

	// Helper for unauthenticated request (no user)
	const createUnauthenticatedRequest = (): AuthenticatedRequest =>
		({
			user: {},
			headers: {
				authorization: `Bearer ${mockToken}`
			}
		}) as unknown as AuthenticatedRequest

	// Helper for request missing token
	const createRequestWithoutToken = (): AuthenticatedRequest =>
		({
			user: { id: mockUserId },
			headers: {}
		}) as unknown as AuthenticatedRequest

	beforeEach(async () => {
		jest.clearAllMocks()

		mockSupabaseClient = {
			from: jest.fn(() => mockSupabaseClient),
			select: jest.fn(() => mockSupabaseClient),
			insert: jest.fn(() => mockSupabaseClient),
			update: jest.fn(() => mockSupabaseClient),
			delete: jest.fn(() => mockSupabaseClient),
			eq: jest.fn(() => mockSupabaseClient),
			in: jest.fn(() => mockSupabaseClient),
			order: jest.fn(() => mockSupabaseClient),
			range: jest.fn(() => ({ data: [], error: null, count: 0 })),
			single: jest.fn(() => ({ data: {}, error: null }))
		}

		mockSupabaseService = {
			getUserClient: jest.fn().mockReturnValue(mockSupabaseClient),
			getAdminClient: jest.fn() // Should NOT be called
		} as unknown as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [NotificationsController],
			providers: [{ provide: SupabaseService, useValue: mockSupabaseService }]
		}).compile()

		controller = module.get<NotificationsController>(NotificationsController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('RLS Enforcement', () => {
		it('should use getUserClient with token, NOT getAdminClient', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.range.mockReturnValue({ data: [], error: null })

			await controller.getNotifications(req)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseService.getAdminClient).not.toHaveBeenCalled()
		})

		it('should throw UnauthorizedException when authorization header is missing', async () => {
			const req = createRequestWithoutToken()

			await expect(controller.getNotifications(req)).rejects.toThrow(
				UnauthorizedException
			)
			expect(mockSupabaseService.getUserClient).not.toHaveBeenCalled()
		})

		it('should throw UnauthorizedException when authorization header is malformed', async () => {
			const req = {
				user: { id: mockUserId },
				headers: { authorization: 'InvalidFormat token' }
			} as unknown as AuthenticatedRequest

			await expect(controller.getNotifications(req)).rejects.toThrow(
				UnauthorizedException
			)
		})
	})

	describe('getNotifications', () => {
		it('should return paginated notifications for authenticated user', async () => {
			const mockNotifications = [
				{ id: 'notif-1', title: 'Test 1', user_id: mockUserId },
				{ id: 'notif-2', title: 'Test 2', user_id: mockUserId }
			]
			const req = createAuthenticatedRequest()
			mockSupabaseClient.range.mockReturnValue({
				data: mockNotifications,
				error: null,
				count: mockNotifications.length
			})

			const result = await controller.getNotifications(req)

			expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockUserId)
			expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 19)
			expect(result).toEqual({
				data: mockNotifications,
				total: mockNotifications.length,
				page: 1,
				limit: 20
			})
		})

		it('should support page + limit parameters', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.range.mockReturnValue({
				data: [],
				error: null,
				count: 0
			})

			await controller.getNotifications(req, 2, 20, false)

			expect(mockSupabaseClient.range).toHaveBeenCalledWith(20, 39)
		})

		it('should support unreadOnly filter', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.range.mockReturnValue({
				data: [],
				error: null,
				count: 0
			})

			await controller.getNotifications(req, 1, 20, true)

			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_read', false)
		})

		it('should throw UnauthorizedException when user.id is missing', async () => {
			const req = createUnauthenticatedRequest()

			await expect(controller.getNotifications(req)).rejects.toThrow(
				UnauthorizedException
			)
		})

		it('should throw BadRequestException on database error', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.range.mockReturnValue({
				data: null,
				error: { message: 'Database error' },
				count: 0
			})

			await expect(controller.getNotifications(req)).rejects.toThrow(
				BadRequestException
			)
		})

		it('should return empty array when no notifications found', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.range.mockReturnValue({
				data: null,
				error: null,
				count: 0
			})

			const result = await controller.getNotifications(req)

			expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 })
		})
	})

	describe('createNotification', () => {
		const validNotificationData = {
			user_id: 'user-123',
			title: 'Test Notification',
			content: 'Test content',
			type: 'maintenance' as const,
			priority: 'medium' as const,
			actionUrl: '/test-url'
		}

		it('should create notification with RLS-scoped client', async () => {
			const req = createAuthenticatedRequest()
			const mockCreatedNotification = {
				id: 'notif-123',
				...validNotificationData
			}
			mockSupabaseClient.single.mockResolvedValue({
				data: mockCreatedNotification,
				error: null
			})

			const result = await controller.createNotification(
				req,
				validNotificationData
			)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
			expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
				user_id: validNotificationData.user_id,
				title: validNotificationData.title,
				message: validNotificationData.content,
				notification_type: validNotificationData.type,
				action_url: validNotificationData.actionUrl,
				is_read: false
			})
			expect(result).toEqual({ notification: mockCreatedNotification })
		})

		it('should create notification without optional actionUrl', async () => {
			const req = createAuthenticatedRequest()
			const dataWithoutUrl = { ...validNotificationData, actionUrl: undefined }
			mockSupabaseClient.single.mockResolvedValue({
				data: { id: 'notif-456' },
				error: null
			})

			await controller.createNotification(req, dataWithoutUrl)

			expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
				expect.objectContaining({ action_url: null })
			)
		})

		it('should throw BadRequestException on creation failure', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Creation failed' }
			})

			await expect(
				controller.createNotification(req, validNotificationData)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('markAsRead', () => {
		const notificationId = 'notif-123'

		it('should mark notification as read with RLS-scoped client', async () => {
			const req = createAuthenticatedRequest()
			// Chain returns for eq calls
			let eqCallCount = 0
			mockSupabaseClient.eq.mockImplementation(() => {
				eqCallCount++
				if (eqCallCount === 2) return { error: null }
				return mockSupabaseClient
			})

			const result = await controller.markAsRead(notificationId, req)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
			expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_read: true })
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', notificationId)
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockUserId)
			expect(result).toEqual({ success: true })
		})

		it('should throw UnauthorizedException when user.id is missing', async () => {
			const req = createUnauthenticatedRequest()

			await expect(controller.markAsRead(notificationId, req)).rejects.toThrow(
				UnauthorizedException
			)
		})

		it('should throw BadRequestException on update failure', async () => {
			const req = createAuthenticatedRequest()
			let eqCallCount = 0
			mockSupabaseClient.eq.mockImplementation(() => {
				eqCallCount++
				if (eqCallCount === 2) return { error: { message: 'Update failed' } }
				return mockSupabaseClient
			})

			await expect(controller.markAsRead(notificationId, req)).rejects.toThrow(
				BadRequestException
			)
		})
	})

	describe('deleteNotification', () => {
		const notificationId = 'notif-123'

		it('should delete notification with RLS-scoped client', async () => {
			const req = createAuthenticatedRequest()
			let eqCallCount = 0
			mockSupabaseClient.eq.mockImplementation(() => {
				eqCallCount++
				if (eqCallCount === 2) return { error: null }
				return mockSupabaseClient
			})

			const result = await controller.deleteNotification(notificationId, req)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
			expect(mockSupabaseClient.delete).toHaveBeenCalled()
			expect(result).toEqual({ success: true })
		})

		it('should throw UnauthorizedException when user.id is missing', async () => {
			const req = createUnauthenticatedRequest()

			await expect(
				controller.deleteNotification(notificationId, req)
			).rejects.toThrow(UnauthorizedException)
		})

		it('should throw BadRequestException on deletion failure', async () => {
			const req = createAuthenticatedRequest()
			let eqCallCount = 0
			mockSupabaseClient.eq.mockImplementation(() => {
				eqCallCount++
				if (eqCallCount === 2) return { error: { message: 'Deletion failed' } }
				return mockSupabaseClient
			})

			await expect(
				controller.deleteNotification(notificationId, req)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('createMaintenanceNotification', () => {
		const maintenanceData = {
			user_id: 'user-123',
			maintenanceId: 'maint-456',
			propertyName: 'Sunset Apartments',
			unit_number: '2A'
		}

		it('should create maintenance notification with RLS-scoped client', async () => {
			const req = createAuthenticatedRequest()
			const expectedNotification = { id: 'notif-789', ...maintenanceData }
			mockSupabaseClient.single.mockResolvedValue({
				data: expectedNotification,
				error: null
			})

			const result = await controller.createMaintenanceNotification(
				req,
				maintenanceData
			)

			expect(mockSupabaseService.getUserClient).toHaveBeenCalledWith(mockToken)
			expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
				user_id: maintenanceData.user_id,
				title: 'Maintenance Request Update',
				message: `Your maintenance request for ${maintenanceData.propertyName} Unit ${maintenanceData.unit_number} has been updated.`,
				notification_type: 'maintenance',
				entity_id: maintenanceData.maintenanceId,
				entity_type: 'maintenance',
				action_url: `/maintenance/${maintenanceData.maintenanceId}`,
				is_read: false
			})
			expect(result).toEqual({ notification: expectedNotification })
		})

		it('should throw BadRequestException on creation failure', async () => {
			const req = createAuthenticatedRequest()
			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { message: 'Creation failed' }
			})

			await expect(
				controller.createMaintenanceNotification(req, maintenanceData)
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('getPriorityInfo', () => {
		it('should return correct info for LOW priority', async () => {
			const result = await controller.getPriorityInfo('low')
			expect(result).toEqual({
				color: 'hsl(var(--muted-foreground))',
				label: 'Low Priority'
			})
		})

		it('should return correct info for MEDIUM priority', async () => {
			const result = await controller.getPriorityInfo('medium')
			expect(result).toEqual({ color: '#FF9500', label: 'Medium Priority' })
		})

		it('should return correct info for HIGH priority', async () => {
			const result = await controller.getPriorityInfo('high')
			expect(result).toEqual({
				color: 'hsl(var(--destructive))',
				label: 'High Priority'
			})
		})

		it('should return correct info for EMERGENCY priority', async () => {
			const result = await controller.getPriorityInfo('EMERGENCY')
			expect(result).toEqual({ color: '#FF3B30', label: 'Emergency' })
		})

		it('should handle case insensitive priority input', async () => {
			const result = await controller.getPriorityInfo('low')
			expect(result).toEqual({
				color: 'hsl(var(--muted-foreground))',
				label: 'Low Priority'
			})
		})

		it('should throw BadRequestException for invalid priority', async () => {
			await expect(controller.getPriorityInfo('INVALID')).rejects.toThrow(
				BadRequestException
			)
		})
	})
})
