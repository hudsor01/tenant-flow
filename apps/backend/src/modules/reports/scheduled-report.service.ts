import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'
import { GeneratedReportService } from './generated-report.service'

export interface CreateScheduleData {
	userId: string
	reportType: string
	reportName: string
	format: 'pdf' | 'excel'
	frequency: 'daily' | 'weekly' | 'monthly'
	dayOfWeek?: number
	dayOfMonth?: number
	hour?: number
	timezone?: string
	startDate: string
	endDate: string
	metadata?: Record<string, unknown>
}

export interface ScheduledReportRecord {
	id: string
	userId: string
	reportType: string
	reportName: string
	format: string
	frequency: string
	dayOfWeek: number | null
	dayOfMonth: number | null
	hour: number
	timezone: string
	isActive: boolean
	lastRunAt: string | null
	nextRunAt: string | null
	metadata: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

@Injectable()
export class ScheduledReportService {
	private readonly logger = new Logger(ScheduledReportService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly queryHelpers: SupabaseQueryHelpers,
		private readonly generatedReportService: GeneratedReportService
	) {}

	/**
	 * Create a new scheduled report
	 */
	async createSchedule(
		data: CreateScheduleData
	): Promise<ScheduledReportRecord> {
		const client = this.supabaseService.getAdminClient()

		// Calculate next run time
		const nextRunAt = this.calculateNextRunAt(
			data.frequency,
			data.dayOfWeek,
			data.dayOfMonth,
			data.hour || 9,
			data.timezone || 'UTC'
		)

		const record = await this.queryHelpers.querySingle<ScheduledReportRecord>(
			client
				.from('scheduled_report')
				.insert({
					userId: data.userId,
					reportType: data.reportType,
					reportName: data.reportName,
					format: data.format,
					frequency: data.frequency,
					dayOfWeek: data.dayOfWeek || null,
					dayOfMonth: data.dayOfMonth || null,
					hour: data.hour || 9,
					timezone: data.timezone || 'UTC',
					isActive: true,
					nextRunAt: nextRunAt.toISOString(),
					metadata: (data.metadata || {}) as never
				})
				.select()
				.single(),
			{
				resource: 'scheduled_report',
				operation: 'createSchedule',
				userId: data.userId
			}
		)

		this.logger.log(`Created schedule ${record.id} for user ${data.userId}`)
		return record
	}

	/**
	 * List all schedules for a user
	 */
	async listSchedules(userId: string): Promise<ScheduledReportRecord[]> {
		const client = this.supabaseService.getAdminClient()

		return this.queryHelpers.queryList<ScheduledReportRecord>(
			client
				.from('scheduled_report')
				.select('*')
				.eq('userId', userId)
				.order('createdAt', { ascending: false }),
			{
				resource: 'scheduled_report',
				operation: 'listSchedules',
				userId
			}
		)
	}

	/**
	 * Delete a schedule (with ownership validation)
	 */
	async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
		const client = this.supabaseService.getAdminClient()

		// First verify ownership using querySingle (throws NotFoundException if not found)
		await this.queryHelpers.querySingle<{ id: string }>(
			client
				.from('scheduled_report')
				.select('id')
				.eq('id', scheduleId)
				.eq('userId', userId)
				.single(),
			{
				resource: 'scheduled_report',
				id: scheduleId,
				operation: 'deleteSchedule',
				userId
			}
		)

		// Delete the schedule
		const { error: deleteError } = await client
			.from('scheduled_report')
			.delete()
			.eq('id', scheduleId)
			.eq('userId', userId)

		if (deleteError) {
			this.logger.error(`Failed to delete schedule: ${deleteError.message}`)
			throw deleteError
		}

		this.logger.log(`Deleted schedule ${scheduleId}`)
	}

	/**
	 * Execute all due schedules
	 * This is called by the background cron job
	 */
	async executeDueSchedules(): Promise<number> {
		const client = this.supabaseService.getAdminClient()
		const now = new Date()

		this.logger.log('Checking for due schedules...')

		// Fetch all active schedules that are due
		const schedules = await this.queryHelpers.queryList<ScheduledReportRecord>(
			client
				.from('scheduled_report')
				.select('*')
				.eq('isActive', true)
				.lte('nextRunAt', now.toISOString()),
			{
				resource: 'scheduled_report',
				operation: 'executeDueSchedules'
			}
		)

		if (schedules.length === 0) {
			this.logger.log('No due schedules found')
			return 0
		}

		this.logger.log(`Found ${schedules.length} due schedules to execute`)

		let successCount = 0

		for (const schedule of schedules) {
			try {
				await this.executeSchedule(schedule)
				successCount++
			} catch (error) {
				this.logger.error(
					`Failed to execute schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			}
		}

		this.logger.log(
			`Executed ${successCount} of ${schedules.length} schedules successfully`
		)
		return successCount
	}

	/**
	 * Execute a single schedule
	 */
	private async executeSchedule(
		schedule: ScheduledReportRecord
	): Promise<void> {
		this.logger.log(`Executing schedule ${schedule.id}`)

		try {
			// Calculate date range based on frequency
			const { startDate, endDate } = this.calculateDateRange(schedule.frequency)

			// Generate the report using GeneratedReportService
			const reportData = {
				userId: schedule.userId,
				reportType: schedule.reportType,
				reportName: schedule.reportName,
				format: schedule.format as 'pdf' | 'excel',
				startDate,
				endDate,
				metadata: {
					...(schedule.metadata || {}),
					scheduledReportId: schedule.id,
					generatedByScheduler: true
				}
			}

			// Note: We can't generate the actual report buffer here without the template services
			// The controller will handle the actual generation, this service just manages schedules
			// For now, we'll create a placeholder that will be filled by the actual generation
			await this.generatedReportService.create(reportData)

			// Update schedule with last run and next run times
			const nextRunAt = this.calculateNextRunAt(
				schedule.frequency,
				schedule.dayOfWeek,
				schedule.dayOfMonth,
				schedule.hour,
				schedule.timezone
			)

			const client = this.supabaseService.getAdminClient()
			const { error } = await client
				.from('scheduled_report')
				.update({
					lastRunAt: new Date().toISOString(),
					nextRunAt: nextRunAt.toISOString()
				})
				.eq('id', schedule.id)

			if (error) {
				this.logger.error(`Failed to update schedule: ${error.message}`)
			}

			this.logger.log(`Successfully executed schedule ${schedule.id}`)
		} catch (error) {
			this.logger.error(
				`Error executing schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
			)

			// Mark schedule as failed (optional - we'll just log for now)
			// In production, you might want to implement retry logic or disable failed schedules
			throw error
		}
	}

	/**
	 * Calculate the next run time based on frequency and parameters
	 */
	private calculateNextRunAt(
		frequency: string,
		dayOfWeek?: number | null,
		dayOfMonth?: number | null,
		hour = 9,
		_timezone = 'UTC'
	): Date {
		const now = new Date()
		const next = new Date(now)

		// Set the hour
		next.setUTCHours(hour, 0, 0, 0)

		switch (frequency) {
			case 'daily': {
				// If the time today has passed, schedule for tomorrow
				if (next <= now) {
					next.setUTCDate(next.getUTCDate() + 1)
				}
				break
			}

			case 'weekly': {
				// Schedule for specific day of week
				const targetDay = dayOfWeek ?? 1 // Default to Monday
				const currentDay = next.getUTCDay()
				let daysUntilTarget = targetDay - currentDay

				if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && next <= now)) {
					daysUntilTarget += 7
				}

				next.setUTCDate(next.getUTCDate() + daysUntilTarget)
				break
			}

			case 'monthly': {
				// Schedule for specific day of month
				const targetDate = dayOfMonth ?? 1 // Default to 1st
				next.setUTCDate(targetDate)

				// If the date this month has passed, schedule for next month
				if (next <= now) {
					next.setUTCMonth(next.getUTCMonth() + 1)
				}

				// Handle edge case where day doesn't exist in month (e.g., Feb 30)
				if (next.getUTCDate() !== targetDate) {
					next.setUTCDate(0) // Set to last day of previous month
				}
				break
			}

			default:
				this.logger.warn(`Unknown frequency: ${frequency}, defaulting to daily`)
				if (next <= now) {
					next.setUTCDate(next.getUTCDate() + 1)
				}
		}

		return next
	}

	/**
	 * Calculate date range based on frequency
	 * Used when executing scheduled reports
	 */
	private calculateDateRange(frequency: string): {
		startDate: string
		endDate: string
	} {
		const now = new Date()
		const endDate = new Date(now)
		const startDate = new Date(now)

		switch (frequency) {
			case 'daily':
				// Previous day
				startDate.setDate(startDate.getDate() - 1)
				break

			case 'weekly':
				// Previous 7 days
				startDate.setDate(startDate.getDate() - 7)
				break

			case 'monthly':
				// Previous 30 days
				startDate.setDate(startDate.getDate() - 30)
				break

			default:
				// Default to previous 7 days
				startDate.setDate(startDate.getDate() - 7)
		}

		return {
			startDate: startDate.toISOString().split('T')[0] as string,
			endDate: endDate.toISOString().split('T')[0] as string
		}
	}
}
