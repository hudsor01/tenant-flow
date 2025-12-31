import { Test } from '@nestjs/testing'
import { FailedNotificationsService } from './failed-notifications.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('FailedNotificationsService', () => {
	let service: FailedNotificationsService

	beforeEach(async () => {
		jest.useFakeTimers()

		const module = await Test.createTestingModule({
			providers: [
				FailedNotificationsService,
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<FailedNotificationsService>(FailedNotificationsService)
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('returns null after max retries and does not throw on persistent failures', async () => {
		const failingOperation = jest
			.fn()
			.mockRejectedValue(new Error('SMTP unreachable'))

		const resultPromise = service.retryWithBackoff(
			failingOperation,
			'lease.tenant_signed'
		)

		// Fast-forward all backoff timers (1s + 5s + 15s)
		await jest.runAllTimersAsync()

		await expect(resultPromise).resolves.toBeNull()
		// Initial attempt + 3 retries = 4 total calls
		expect(failingOperation).toHaveBeenCalledTimes(4)
	})
})
