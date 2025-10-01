import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as cron from 'node-cron'
import { ScheduledReportService } from './scheduled-report.service'

@Injectable()
export class SchedulerService implements OnModuleInit {
	private readonly logger = new Logger(SchedulerService.name)
	private scheduledTask: cron.ScheduledTask | null = null

	constructor(
		private readonly scheduledReportService: ScheduledReportService
	) {}

	onModuleInit() {
		// Only run scheduler in production
		const isProd = process.env.NODE_ENV === 'production'
		const isEnabled = process.env.ENABLE_REPORT_SCHEDULER === 'true'

		if (!isProd && !isEnabled) {
			this.logger.log(
				'Report scheduler disabled (not in production and ENABLE_REPORT_SCHEDULER not set)'
			)
			return
		}

		this.logger.log('Initializing report scheduler...')
		this.startScheduler()
	}

	/**
	 * Start the cron job
	 * Runs every 10 minutes (cron: every 10 minutes)
	 */
	private startScheduler() {
		this.scheduledTask = cron.schedule('*/10 * * * *', async () => {
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
		})

		this.logger.log('Report scheduler started - running every 10 minutes')
	}

	/**
	 * Stop the scheduler (called on module destroy)
	 */
	onModuleDestroy() {
		if (this.scheduledTask) {
			this.scheduledTask.stop()
			this.logger.log('Report scheduler stopped')
		}
	}
}
