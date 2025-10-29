import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Logger,
	Post,
	SetMetadata
} from '@nestjs/common'
import { AnalyticsService } from './analytics.service'

// Local type definition - web vitals removed from frontend but keeping backend endpoint
interface WebVitalData {
	name: string
	value: number
	rating: 'good' | 'needs-improvement' | 'poor'
	delta: number
	id: string
	page: string
	timestamp?: string
	sessionId?: string
	userId?: string
}

@Controller('analytics')
export class AnalyticsController {
	private readonly logger = new Logger(AnalyticsController.name)

	constructor(private readonly analyticsService: AnalyticsService) {}

	@Post('web-vitals')
	@SetMetadata('isPublic', true)
	@HttpCode(HttpStatus.ACCEPTED)
	async reportWebVitals(@Body() payload: WebVitalData) {
		// Manual validation for web vitals data
		if (!payload || typeof payload !== 'object') {
			throw new Error('Invalid payload')
		}

		const validNames = ['FCP', 'LCP', 'CLS', 'FID', 'TTFB', 'INP']
		const validRatings = ['good', 'needs-improvement', 'poor']

		if (
			!validNames.includes(payload.name) ||
			typeof payload.value !== 'number' ||
			!validRatings.includes(payload.rating) ||
			typeof payload.delta !== 'number' ||
			typeof payload.id !== 'string'
		) {
			throw new Error('Invalid web vitals data')
		}
		const { userId, sessionId } = payload
		const distinctId = userId ?? sessionId ?? payload.id

		this.logger.verbose('Received web vital metric', {
			name: payload.name,
			rating: payload.rating,
			page: payload.page,
			value: payload.value
		})

		this.analyticsService.recordWebVitalMetric(payload, distinctId)

		return { success: true }
	}
}
