import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
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
@ApiTags('Admin - System')
@ApiBearerAuth('supabase-auth')
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
	@ApiOperation({ summary: 'Get system health', description: 'Get system health status and metrics' })
	@ApiResponse({ status: 200, description: 'System health status retrieved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
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
	@ApiOperation({ summary: 'Get metrics', description: 'Get application metrics' })
	@ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@Get('metrics')
	async getMetrics() {
		return this.adminService.getMetrics()
	}

	/**
	 * Search application logs
	 * GET /api/v1/admin/system/logs?level=error&limit=100&offset=0
	 */
	@ApiOperation({ summary: 'Get logs', description: 'Search application logs' })
	@ApiQuery({ name: 'level', required: false, enum: ['info', 'warning', 'error', 'critical'], description: 'Log severity level' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (max 500)' })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
	@ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@Get('logs')
	async getLogs(
		@Query('level')
		level?: Database['public']['Enums']['security_event_severity'],
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
	@ApiOperation({ summary: 'Get failed jobs', description: 'Get failed queue jobs' })
	@ApiQuery({ name: 'queue', required: false, type: String, description: 'Queue name filter' })
	@ApiResponse({ status: 200, description: 'Failed jobs retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@Get('failed-jobs')
	async getFailedJobs(@Query('queue') queueName?: string) {
		return this.adminService.getFailedJobs(queueName)
	}

	/**
	 * Retry a failed job
	 * POST /api/v1/admin/system/retry-job
	 */
	@ApiOperation({ summary: 'Retry job', description: 'Retry a failed queue job' })
	@ApiBody({ schema: { type: 'object', properties: { queueName: { type: 'string' }, jobId: { type: 'string' } }, required: ['queueName', 'jobId'] } })
	@ApiResponse({ status: 200, description: 'Job retried successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@Post('retry-job')
	async retryJob(@Body() body: { queueName: string; jobId: string }) {
		this.logger.log('Admin: Retrying job', body)
		return this.adminService.retryJob(body.queueName, body.jobId)
	}
}
