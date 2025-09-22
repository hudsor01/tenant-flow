import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Public } from '../shared/decorators/public.decorator'
import { AnalyticsService } from './analytics.service'
import { WebVitalsDto } from './dto/web-vitals.dto'

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
	private readonly logger = new Logger(AnalyticsController.name)

	constructor(private readonly analyticsService: AnalyticsService) {}

	@Post('web-vitals')
	@Public()
	@HttpCode(HttpStatus.ACCEPTED)
	@ApiOperation({ summary: 'Collect web vitals metrics from the frontend' })
	@ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Metric accepted' })
	async reportWebVitals(@Body() payload: WebVitalsDto) {
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
