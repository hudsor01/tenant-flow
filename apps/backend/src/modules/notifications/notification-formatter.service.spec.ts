import { Test } from '@nestjs/testing'
import { SilentLogger } from '../../__test__/silent-logger'
import { NotificationFormatterService } from './notification-formatter.service'

describe('NotificationFormatterService', () => {
	let service: NotificationFormatterService

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			providers: [NotificationFormatterService]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<NotificationFormatterService>(NotificationFormatterService)
	})

	describe('getNotificationType', () => {
		it('returns maintenance_request_created_emergency for URGENT new request', () => {
			const result = service.getNotificationType('URGENT', true)
			expect(result).toBe('maintenance_request_created_emergency')
		})

		it('returns maintenance_request_created_high for HIGH new request', () => {
			const result = service.getNotificationType('HIGH', true)
			expect(result).toBe('maintenance_request_created_high')
		})

		it('returns maintenance_request_created_medium for MEDIUM new request', () => {
			const result = service.getNotificationType('MEDIUM', true)
			expect(result).toBe('maintenance_request_created_medium')
		})

		it('returns maintenance_request_created_low for LOW new request', () => {
			const result = service.getNotificationType('LOW', true)
			expect(result).toBe('maintenance_request_created_low')
		})

		it('returns maintenance_update_emergency for URGENT update', () => {
			const result = service.getNotificationType('URGENT', false)
			expect(result).toBe('maintenance_update_emergency')
		})

		it('returns maintenance_update_high for HIGH update', () => {
			const result = service.getNotificationType('HIGH', false)
			expect(result).toBe('maintenance_update_high')
		})

		it('returns maintenance_update for default', () => {
			const result = service.getNotificationType('UNKNOWN' as any, false)
			expect(result).toBe('maintenance_update')
		})
	})

	describe('getPriorityLabel', () => {
		it('returns Urgent for URGENT priority', () => {
			expect(service.getPriorityLabel('URGENT')).toBe('Urgent')
		})

		it('returns High Priority for HIGH priority', () => {
			expect(service.getPriorityLabel('HIGH')).toBe('High Priority')
		})

		it('returns Medium Priority for MEDIUM priority', () => {
			expect(service.getPriorityLabel('MEDIUM')).toBe('Medium Priority')
		})

		it('returns Low Priority for LOW priority', () => {
			expect(service.getPriorityLabel('LOW')).toBe('Low Priority')
		})

		it('returns priority value for unknown priority', () => {
			expect(service.getPriorityLabel('UNKNOWN' as any)).toBe('UNKNOWN')
		})
	})

	describe('getNotificationUrgency', () => {
		it('returns true for URGENT priority', () => {
			expect(service.getNotificationUrgency('URGENT')).toBe(true)
		})

		it('returns true for HIGH priority', () => {
			expect(service.getNotificationUrgency('HIGH')).toBe(true)
		})

		it('returns false for MEDIUM priority', () => {
			expect(service.getNotificationUrgency('MEDIUM')).toBe(false)
		})

		it('returns false for LOW priority', () => {
			expect(service.getNotificationUrgency('LOW')).toBe(false)
		})
	})

	describe('getNotificationTimeout', () => {
		it('returns 15000 for URGENT priority', () => {
			expect(service.getNotificationTimeout('URGENT')).toBe(15000)
		})

		it('returns 12000 for HIGH priority', () => {
			expect(service.getNotificationTimeout('HIGH')).toBe(12000)
		})

		it('returns 8000 for MEDIUM priority', () => {
			expect(service.getNotificationTimeout('MEDIUM')).toBe(8000)
		})

		it('returns 5000 for LOW priority', () => {
			expect(service.getNotificationTimeout('LOW')).toBe(5000)
		})

		it('returns 8000 for unknown priority', () => {
			expect(service.getNotificationTimeout('UNKNOWN' as any)).toBe(8000)
		})
	})

	describe('shouldSendImmediately', () => {
		it('returns true for URGENT priority', () => {
			expect(service.shouldSendImmediately('URGENT')).toBe(true)
		})

		it('returns true for HIGH priority', () => {
			expect(service.shouldSendImmediately('HIGH')).toBe(true)
		})

		it('returns false for MEDIUM priority', () => {
			expect(service.shouldSendImmediately('MEDIUM')).toBe(false)
		})

		it('returns false for LOW priority', () => {
			expect(service.shouldSendImmediately('LOW')).toBe(false)
		})
	})
})
