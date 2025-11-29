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
import { MobileAnalyticsEventDto } from './dto/mobile-analytics-event.dto'
import { WebVitalDto } from './dto/web-vital.dto'

@Controller('analytics')
export class AnalyticsController {
	private readonly logger = new Logger(AnalyticsController.name)

	constructor(private readonly analyticsService: AnalyticsService) {}

	@Post()
	@SetMetadata('isPublic', true)
	@HttpCode(HttpStatus.ACCEPTED)
	async ingestMobileEvent(@Body() payload: MobileAnalyticsEventDto) {
		this.analyticsService.recordMobileEvent(payload)
		return { success: true }
	}

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
