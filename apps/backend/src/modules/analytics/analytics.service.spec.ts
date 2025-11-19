import { AnalyticsService } from './analytics.service'

const BASE_EVENT = {
	eventName: 'mobile_nav_opened',
	properties: {
		action: 'open',
		password: 'super-secret',
		user_id: 'user-42',
		longString: 'x'.repeat(600)
	},
	timestamp: Date.now(),
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)',
	screenResolution: '390x844',
	networkType: '4g',
	isOnline: true
}

describe('AnalyticsService', () => {
	let service: AnalyticsService

	beforeEach(() => {
		service = new AnalyticsService()
	})

	it('records sanitized mobile analytics events', () => {
		const trackSpy = jest.spyOn(service, 'track').mockImplementation()

		service.recordMobileEvent(BASE_EVENT)

		expect(trackSpy).toHaveBeenCalledWith(
			'user-42',
			'mobile:mobile_nav_opened',
			{
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)',
				screenResolution: '390x844',
				networkType: '4g',
				isOnline: true,
				timestamp: expect.any(String),
				properties: {
					action: 'open',
					user_id: 'user-42',
					longString: 'x'.repeat(256)
				},
				source: 'mobile-analytics-endpoint'
			}
		)
	})

	it('falls back to anonymous ids when user data is absent', () => {
		const trackSpy = jest.spyOn(service, 'track').mockImplementation()

		service.recordMobileEvent({
			...BASE_EVENT,
			properties: {}
		})

		expect(trackSpy).toHaveBeenCalledWith(
			expect.stringMatching(/^mobile:/),
			'mobile:mobile_nav_opened',
			expect.any(Object)
		)
	})
})
