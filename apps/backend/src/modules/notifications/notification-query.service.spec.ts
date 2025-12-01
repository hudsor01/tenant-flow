import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { SupabaseService } from '../../database/supabase.service'
import { NotificationQueryService } from './notification-query.service'

describe('NotificationQueryService', () => {
	let service: NotificationQueryService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const mockUserId = 'user-123'

	// Mock Supabase query builder
	const createMockQueryBuilder = (data: unknown | null, error: Error | null = null) => {
		const builder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			lt: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			delete: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data, error })
		}
		return builder
	}

	beforeEach(async () => {
		const mockAdminClient = {
			from: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module = await Test.createTestingModule({
			providers: [
				NotificationQueryService,
				{ provide: SupabaseService, useValue: mockSupabaseService }
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<NotificationQueryService>(NotificationQueryService)
	})

	describe('getUnreadNotifications', () => {
		it('returns unread notifications for user', async () => {
			const mockNotifications = [
				{ id: 'notif-1', user_id: mockUserId, is_read: false, title: 'Test 1' },
				{ id: 'notif-2', user_id: mockUserId, is_read: false, title: 'Test 2' }
			]
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = createMockQueryBuilder(mockNotifications)
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)
			// Override single to return array
			mockBuilder.order = jest.fn().mockResolvedValue({ data: mockNotifications, error: null })

			const result = await service.getUnreadNotifications(mockUserId)

			expect(result).toEqual(mockNotifications)
			expect(mockClient.from).toHaveBeenCalledWith('notifications')
		})

		it('returns empty array on error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = createMockQueryBuilder(null, new Error('db error'))
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)
			mockBuilder.order = jest.fn().mockResolvedValue({ data: null, error: new Error('db error') })

			await expect(service.getUnreadNotifications(mockUserId)).rejects.toThrow()
		})
	})

	describe('markAsRead', () => {
		it('marks notification as read', async () => {
			const mockNotification = { id: 'notif-1', user_id: mockUserId, is_read: true }
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(createMockQueryBuilder(mockNotification))

			const result = await service.markAsRead('notif-1', mockUserId)

			expect(result.is_read).toBe(true)
		})

		it('throws error when notification not found', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			;(mockClient.from as jest.Mock).mockReturnValue(
				createMockQueryBuilder(null, new Error('not found'))
			)

			await expect(service.markAsRead('invalid', mockUserId)).rejects.toThrow()
		})
	})

	describe('getUnreadCount', () => {
		it('returns count of unread notifications', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			// getUnreadCount has chained .eq().eq() - need to return this for first, Promise for second
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn()
					.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 5, error: null }) })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.getUnreadCount(mockUserId)

			expect(result).toBe(5)
		})

		it('returns 0 on error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn()
					.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: null, error: new Error('db error') }) })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.getUnreadCount(mockUserId)

			expect(result).toBe(0)
		})
	})

	describe('markAllAsRead', () => {
		it('marks all notifications as read and returns count', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockResolvedValue({
					data: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
					error: null
				})
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.markAllAsRead(mockUserId)

			expect(result).toBe(3)
		})

		it('returns 0 on error', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockResolvedValue({ data: null, error: new Error('db error') })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			const result = await service.markAllAsRead(mockUserId)

			expect(result).toBe(0)
		})
	})

	describe('cancelNotification', () => {
		it('cancels notification by prepending CANCELLED to title and message', async () => {
			const originalNotification = {
				id: 'notif-1',
				user_id: mockUserId,
				title: 'Original Title',
				message: 'Original Message'
			}
			const cancelledNotification = {
				...originalNotification,
				title: '[CANCELLED] Original Title',
				message: '[CANCELLED] Original Message'
			}

			const mockClient = mockSupabaseService.getAdminClient()
			// First call for fetch, second for update
			;(mockClient.from as jest.Mock)
				.mockReturnValueOnce(createMockQueryBuilder(originalNotification))
				.mockReturnValueOnce(createMockQueryBuilder(cancelledNotification))

			const result = await service.cancelNotification('notif-1', mockUserId)

			expect(result.title).toBe('[CANCELLED] Original Title')
		})
	})

	describe('cleanupOldNotifications', () => {
		it('deletes read notifications older than specified days', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				delete: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({ error: null })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			await service.cleanupOldNotifications(30)

			expect(mockBuilder.delete).toHaveBeenCalled()
			expect(mockBuilder.eq).toHaveBeenCalledWith('is_read', true)
		})

		it('throws error on database failure', async () => {
			const mockClient = mockSupabaseService.getAdminClient()
			const mockBuilder = {
				delete: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({ error: new Error('db error') })
			}
			;(mockClient.from as jest.Mock).mockReturnValue(mockBuilder)

			await expect(service.cleanupOldNotifications(30)).rejects.toThrow()
		})
	})
})
