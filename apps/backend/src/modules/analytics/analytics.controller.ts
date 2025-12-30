import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	SetMetadata
} from '@nestjs/common'
import {
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { MobileAnalyticsEventDto } from './dto/mobile-analytics-event.dto'
import { WebVitalDto } from './dto/web-vital.dto'
import { AppLogger } from '../../logger/app-logger.service'

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
	constructor(
		private readonly analyticsService: AnalyticsService,
		private readonly logger: AppLogger
	) {}

	@ApiOperation({ summary: 'Ingest mobile event', description: 'Record a mobile analytics event (public endpoint)' })
	@ApiBody({ type: MobileAnalyticsEventDto })
	@ApiResponse({ status: 202, description: 'Event accepted for processing' })
	@Post()
	@SetMetadata('isPublic', true)
	@HttpCode(HttpStatus.ACCEPTED)
	async ingestMobileEvent(@Body() payload: MobileAnalyticsEventDto) {
		this.analyticsService.recordMobileEvent(payload)
		return { success: true }
	}

	@ApiOperation({ summary: 'Report web vitals', description: 'Record Core Web Vitals metrics (public endpoint)' })
	@ApiBody({ type: WebVitalDto })
	@ApiResponse({ status: 202, description: 'Web vital metrics accepted' })
	@Post('web-vitals')
	@SetMetadata('isPublic', true)
	@HttpCode(HttpStatus.ACCEPTED)
	async reportWebVitals(@Body() payload: WebVitalDto) {
		const distinctId = payload.user_id ?? payload.sessionId ?? payload.id

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
