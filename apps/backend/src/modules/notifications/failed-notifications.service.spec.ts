import { FailedNotificationsService } from './failed-notifications.service'

describe('FailedNotificationsService', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('returns null after max retries and does not throw on persistent failures', async () => {
		const service = new FailedNotificationsService()
		const failingOperation = jest.fn().mockRejectedValue(new Error('SMTP unreachable'))

		const resultPromise = service.retryWithBackoff(failingOperation, 'lease.tenant_signed')

		// Fast-forward all backoff timers (1s + 5s + 15s)
		await jest.runAllTimersAsync()

		await expect(resultPromise).resolves.toBeNull()
		// Initial attempt + 3 retries = 4 total calls
		expect(failingOperation).toHaveBeenCalledTimes(4)
	})
})
