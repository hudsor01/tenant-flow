import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { ActivityService } from './activity.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
	constructor(private readonly activityService: ActivityService) {}

	@Get('feed')
	async getActivityFeed(
		@CurrentUser() user: { sub: string },
		@Query('limit') limit?: string
	) {
		const limitNum = limit ? parseInt(limit, 10) : 10
		const activities = await this.activityService.getActivityFeed(
			user.sub,
			limitNum
		)

		return {
			success: true,
			data: activities
		}
	}

	@Get('realtime')
	async getRealtimeActivityFeed(
		@CurrentUser() user: { sub: string },
		@Query('limit') limit?: string
	) {
		const limitNum = limit ? parseInt(limit, 10) : 10
		const result = await this.activityService.getRealtimeActivitySummary(
			user.sub,
			limitNum
		)

		return {
			success: true,
			...result
		}
	}
}
