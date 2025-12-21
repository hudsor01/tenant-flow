import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { AdminService } from '../services/admin.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../../shared/guards/roles.guard'

/**
 * Admin System Controller
 * Handles system monitoring and management endpoints
 * 
 * SECURITY: Protected by RolesGuard - only users with ADMIN role can access
 */
@Controller('admin/system')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminSystemController {
	constructor(
		private readonly adminService: AdminService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get system health status
	 * GET /api/v1/admin/system/health
	 */
	@Get('health')
	async getHealth() {
		const metrics = await this.adminService.getMetrics()

		return {
			status: 'healthy',
			timestamp: new Date().toISOString(),
			database: {
				connected: true,
				users: metrics.users,
				properties: metrics.properties
			},
			queues: {
				emails: metrics.queues.emails,
				webhooks: metrics.queues.webhooks
			}
		}
	}

	/**
	 * Get application metrics
	 * GET /api/v1/admin/system/metrics
	 */
	@Get('metrics')
	async getMetrics() {
		return this.adminService.getMetrics()
	}

	/**
	 * Search application logs
	 * GET /api/v1/admin/system/logs?level=error&limit=100&offset=0
	 */
	@Get('logs')
	async getLogs(
		@Query('level') level?: Database['public']['Enums']['security_event_severity'],
		@Query('limit') limit = '100',
		@Query('offset') offset = '0'
	) {
		return this.adminService.getLogs({
			...(level && { level }),
			limit: Math.min(Number(limit), 500),
			offset: Number(offset)
		})
	}

	/**
	 * Get failed queue jobs
	 * GET /api/v1/admin/system/failed-jobs?queue=emails
	 */
	@Get('failed-jobs')
	async getFailedJobs(@Query('queue') queueName?: string) {
		return this.adminService.getFailedJobs(queueName)
	}

	/**
	 * Retry a failed job
	 * POST /api/v1/admin/system/retry-job
	 */
	@Post('retry-job')
	async retryJob(@Body() body: { queueName: string; jobId: string }) {
		this.logger.log('Admin: Retrying job', body)
		return this.adminService.retryJob(body.queueName, body.jobId)
	}
}
