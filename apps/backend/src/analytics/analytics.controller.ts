import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Logger,
	Post
} from '@nestjs/common'
import type { WebVitalData } from '@repo/shared'
// Swagger imports removed
import { Public } from '../shared/decorators/public.decorator'
import { RouteSchema } from '../shared/decorators/route-schema.decorator'
import { AnalyticsService } from './analytics.service'

// JSON Schema for web vitals validation
const webVitalsSchema = {
	type: 'object',
	properties: {
		name: { enum: ['FCP', 'LCP', 'CLS', 'FID', 'TTFB', 'INP'] },
		value: { type: 'number' },
		rating: { enum: ['good', 'needs-improvement', 'poor'] },
		delta: { type: 'number' },
		id: { type: 'string' },
		label: { enum: ['web-vital', 'custom'], nullable: true },
		navigationType: { type: 'string', nullable: true },
		page: { type: 'string', nullable: true },
		timestamp: { type: 'string', format: 'date-time', nullable: true },
		sessionId: { type: 'string', nullable: true },
		userId: { type: 'string', nullable: true }
	},
	required: ['name', 'value', 'rating', 'delta', 'id'],
	additionalProperties: false
}

// @ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
	private readonly logger = new Logger(AnalyticsController.name)

	constructor(private readonly analyticsService: AnalyticsService) {}

	@Post('web-vitals')
	@Public()
	@HttpCode(HttpStatus.ACCEPTED)
	@RouteSchema({
		method: 'POST',
		path: 'analytics/web-vitals',
		schema: webVitalsSchema
	})
	// @ApiOperation({ summary: 'Collect web vitals metrics from the frontend' })
	// @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Metric accepted' })
	async reportWebVitals(@Body() payload: WebVitalData) {
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
