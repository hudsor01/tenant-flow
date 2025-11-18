import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Json } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { GeneratedReportService } from './generated-report.service'

export interface CreateScheduleData {
	user_id: string
	reportType: string
	reportName: string
	format: 'pdf' | 'excel'
	frequency: 'daily' | 'weekly' | 'monthly'
	dayOfWeek?: number
	dayOfMonth?: number
	hour?: number
	timezone?: string
	start_date: string
	end_date: string
	metadata?: Record<string, unknown>
}

export interface ScheduledReportRecord {
	id: string
	user_id: string
	report_type: string
	report_name: string
	format: string
	frequency: string
	day_of_week: number | null
	day_of_month: number | null
	hour: number
	timezone: string
	is_active: boolean
	last_run_at: string | null
	next_run_at: string | null
	metadata: Json | null
	created_at: string
	updated_at: string
}

@Injectable()
export class ScheduledReportService {
	private readonly logger = new Logger(ScheduledReportService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly generatedReportService: GeneratedReportService
	) {}

	private getUserClient(token: string) {
		return this.supabaseService.getUserClient(token)
	}

	/**
	 * Create a new scheduled report
	 */
	async createSchedule(
		data: CreateScheduleData,
		token: string
	): Promise<ScheduledReportRecord> {
		const client = this.getUserClient(token)

		// Calculate next run time
		const nextRunAt = this.calculateNextRunAt(
			data.frequency,
			data.dayOfWeek,
			data.dayOfMonth,
			data.hour || 9,
			data.timezone || 'UTC'
		)

		const { data: record, error } = await client
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('scheduled_report' as any)
			.insert({
				user_id: data.user_id,
				report_type: data.reportType,
				report_name: data.reportName,
				format: data.format,
				frequency: data.frequency,
				day_of_week: data.dayOfWeek || null,
				day_of_month: data.dayOfMonth || null,
				hour: data.hour || 9,
				timezone: data.timezone || 'UTC',
				is_active: true,
				next_run_at: nextRunAt.toISOString(),
				metadata: (data.metadata || {}) as never
			})
			.select()
			.single()

		if (error) {
			this.logger.error(`Failed to create schedule: ${error.message}`)
			throw error
		}

		this.logger.log(`Created schedule ${(record as unknown as ScheduledReportRecord).id} for user ${data.user_id}`)
		return record as unknown as ScheduledReportRecord
	}

	/**
	 * List all schedules for a user
	 */
	async listSchedules(
		user_id: string,
		token: string
	): Promise<ScheduledReportRecord[]> {
		const client = this.getUserClient(token)

		// Defense-in-depth: Explicit user_id filter even though RLS should handle this
		// This ensures users can only see their own scheduled reports
		const { data, error } = await client
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('scheduled_report' as any)
			.select('*')
			.eq('user_id', user_id)
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error(`Failed to list schedules: ${error.message}`)
			throw error
		}

		return data as unknown as ScheduledReportRecord[]
	}

	/**
	 * Delete a schedule (with ownership validation)
	 */
	async deleteSchedule(
		scheduleId: string,
		user_id: string,
		token: string
	): Promise<void> {
		const client = this.getUserClient(token)

		// Defense-in-depth: Verify ownership with explicit user_id filter
		// RLS should already enforce this, but we add an extra layer of security
		const { data: schedule, error: fetchError } = await client
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('scheduled_report' as any)
			.select('id')
			.eq('id', scheduleId)
			.eq('user_id', user_id)
			.single()

		if (fetchError || !schedule) {
			throw new NotFoundException('Schedule not found or access denied')
		}

		// Delete the schedule
		const { error: deleteError } = await client
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('scheduled_report' as any)
			.delete()
			.eq('id', scheduleId)

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
		const { data: schedules, error } = await client
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('scheduled_report' as any)
			.select('*')
			.eq('is_active', true)
			.lte('next_run_at', now.toISOString())

		if (error) {
			this.logger.error(`Failed to fetch due schedules: ${error.message}`)
			return 0
		}

		if (!schedules || schedules.length === 0) {
			this.logger.log('No due schedules found')
			return 0
		}

		this.logger.log(`Found ${schedules.length} due schedules to execute`)

		let successCount = 0

		for (const schedule of schedules) {
			try {
				const typedSchedule = schedule as unknown as ScheduledReportRecord
				await this.executeSchedule(typedSchedule)
				successCount++
			} catch (error) {
				const typedSchedule = schedule as unknown as ScheduledReportRecord
				this.logger.error(
					`Failed to execute schedule ${typedSchedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
			const { start_date, end_date } = this.calculateDateRange(schedule.frequency)

			// Generate the report using GeneratedReportService
			const reportData = {
			user_id: schedule.user_id,
			reportType: schedule.report_type,
			reportName: schedule.report_name,
			format: schedule.format as 'pdf' | 'excel',
			start_date,
			end_date,
				metadata: {
					...(schedule.metadata && typeof schedule.metadata === 'object' && !Array.isArray(schedule.metadata) ? schedule.metadata : {}),
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
			schedule.day_of_week,
			schedule.day_of_month,
			schedule.hour,
			schedule.timezone
		)

			const client = this.supabaseService.getAdminClient()
			const { error } = await client
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('scheduled_report' as any)
				.update({
				last_run_at: new Date().toISOString(),
				next_run_at: nextRunAt.toISOString()
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
		start_date: string
		end_date: string
	} {
		const now = new Date()
		const end_date = new Date(now)
		const start_date = new Date(now)

		switch (frequency) {
			case 'daily':
				// Previous day
				start_date.setDate(start_date.getDate() - 1)
				break

			case 'weekly':
				// Previous 7 days
				start_date.setDate(start_date.getDate() - 7)
				break

			case 'monthly':
				// Previous 30 days
				start_date.setDate(start_date.getDate() - 30)
				break

			default:
				// Default to previous 7 days
				start_date.setDate(start_date.getDate() - 7)
		}

		return {
			start_date: start_date.toISOString().split('T')[0] as string,
			end_date: end_date.toISOString().split('T')[0] as string
		}
	}
}
