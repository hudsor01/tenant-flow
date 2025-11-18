import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ScheduledReportService } from './scheduled-report.service'
import { AppConfigService } from '../../config/app-config.service'

/**
 * ULTRA-NATIVE: Uses @nestjs/schedule (official NestJS package)
 * Replaced node-cron with native NestJS scheduler for better lifecycle management
 */
@Injectable()
export class SchedulerService {
	private readonly logger = new Logger(SchedulerService.name)
	private isEnabled = false

	constructor(
		private readonly scheduledReportService: ScheduledReportService,
		private readonly appConfigService: AppConfigService
	) {
		// Only run scheduler in production
		const isProd = this.appConfigService.isProduction()

		this.isEnabled = isProd

		if (!this.isEnabled) {
			this.logger.log(
				'Report scheduler disabled (not in production)'
			)
		} else {
			this.logger.log('Report scheduler enabled - will run every 10 minutes')
		}
	}

	/**
	 * Native @nestjs/schedule cron job
	 * Runs every 10 minutes using CronExpression helper
	 */
	@Cron('*/10 * * * *', {
		name: 'scheduled-reports'
	})
	handleScheduledReports() {
		this.doScheduledReports()
	}

	private async doScheduledReports(): Promise<void> {
		if (!this.isEnabled) {
			return
		}

		const startTime = Date.now()
		this.logger.log('Starting scheduled report execution...')

		try {
			const count = await this.scheduledReportService.executeDueSchedules()
			const duration = Date.now() - startTime

			this.logger.log(
				`Completed scheduled report execution: ${count} schedules processed in ${duration}ms`
			)
		} catch (error) {
			this.logger.error(
				`Error in scheduled report execution: ${error instanceof Error ? error.message : 'Unknown error'}`
			)
		}
	}
}
