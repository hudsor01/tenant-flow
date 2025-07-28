import { Controller, Get, Post, Delete, Query, Body, Param } from '@nestjs/common'
import { ActivityService } from './activity.service'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { CreateActivityInput } from '@tenantflow/shared/types/activity'


@Controller('activity')
export class ActivityController {
	constructor(private readonly activityService: ActivityService) {}

	@Post()
	async createActivity(
		@CurrentUser() user: { sub: string },
		@Body() input: Omit<CreateActivityInput, 'userId'>
	) {
		return this.activityService.create({
			...input,
			userId: user.sub
		})
	}

	@Get()
	async getUserActivities(
		@CurrentUser() user: { sub: string },
		@Query('limit') limit?: string
	) {
		const limitNum = limit ? parseInt(limit, 10) : 10
		return this.activityService.findByUser(user.sub, limitNum)
	}

	@Delete(':id')
	async deleteActivity(@Param('id') id: string) {
		return this.activityService.delete(id)
	}
}
