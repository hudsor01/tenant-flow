import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import { SupabaseService } from '../../database/supabase.service'

export interface GeneratedReportData {
	user_id: string
	reportType: string
	reportName: string
	format: 'pdf' | 'excel'
	start_date: string
	end_date: string
	fileBuffer?: Buffer
	metadata?: Record<string, unknown>
}

export interface GeneratedReportRecord {
	id: string
	user_id: string
	reportType: string
	reportName: string
	format: string
	status: 'generating' | 'completed' | 'failed'
	fileUrl: string | null
	filePath: string | null
	fileSize: number | null
	start_date: string
	end_date: string
	metadata: Record<string, unknown>
	errorMessage: string | null
	created_at: string
	updated_at: string
}

@Injectable()
export class GeneratedReportService {
	private readonly logger = new Logger(GeneratedReportService.name)
	private readonly reportsDir = path.join(process.cwd(), 'reports')

	constructor(private readonly supabase: SupabaseService) {
		this.ensureReportsDirectory()
	}

	private async ensureReportsDirectory(): Promise<void> {
		try {
			await fs.mkdir(this.reportsDir, { recursive: true })
		} catch (error) {
			this.logger.error(`Failed to create reports directory: ${error}`)
		}
	}

	private async getUserDirectory(user_id: string): Promise<string> {
		const userDir = path.join(this.reportsDir, user_id)
		await fs.mkdir(userDir, { recursive: true })
		return userDir
	}

	async create(data: GeneratedReportData): Promise<GeneratedReportRecord> {
		const client = this.supabase.getAdminClient()

		try {
			// Generate unique filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const extension = data.format === 'excel' ? 'xlsx' : 'pdf'
			const filename = `${data.reportType}_${timestamp}.${extension}`

			// Save file to disk if buffer provided
			let filePath: string | null = null
			let fileSize: number | null = null

			if (data.fileBuffer) {
				const userDir = await this.getUserDirectory(data.user_id)
				filePath = path.join(userDir, filename)
				await fs.writeFile(filePath, data.fileBuffer)
				fileSize = data.fileBuffer.length
			}

			// Insert record into database
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { data: record, error } = await (client.from('generated_report' as any) as any)
				.insert({
					user_id: data.user_id,
					reportType: data.reportType,
					reportName: data.reportName,
					format: data.format,
					status: 'completed',
					filePath,
					fileSize,
					start_date: data.start_date,
					end_date: data.end_date,
					metadata: (data.metadata || {}) as never
				})
				.select()
				.single()

			if (error) {
				this.logger.error(`Failed to create report record: ${error.message}`)
				throw error
			}

			return record as GeneratedReportRecord
		} catch (error) {
			this.logger.error(`Report creation failed: ${error}`)
			throw error
		}
	}

	async findAll(
		user_id: string,
		options?: { limit?: number; offset?: number }
	): Promise<{ reports: GeneratedReportRecord[]; total: number }> {
		const client = this.supabase.getAdminClient()
		const limit = options?.limit || 20
		const offset = options?.offset || 0

		try {
			// Get total count
			const { count } = await (
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				client.from('generated_report' as any) as any
			)
				.select('*', { count: 'exact', head: true })
				.eq('user_id', user_id)

			// Get paginated records
			const { data: reports, error } = await (
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				client.from('generated_report' as any) as any
			)
				.select('*')
				.eq('user_id', user_id)
				.order('created_at', { ascending: false })
				.range(offset, offset + limit - 1)

			if (error) {
				this.logger.error(`Failed to fetch reports: ${error.message}`)
				throw error
			}

			return {
				reports: (reports || []) as unknown as GeneratedReportRecord[],
				total: count || 0
			}
		} catch (error) {
			this.logger.error(`Failed to fetch reports: ${error}`)
			throw error
		}
	}

	async findOne(
		user_id: string,
		reportId: string
	): Promise<GeneratedReportRecord> {
		const client = this.supabase.getAdminClient()

		try {
			const { data: report, error } = await client
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('generated_report' as any)
				.select('*')
				.eq('id', reportId)
				.eq('user_id', user_id)
				.single()

			if (error || !report) {
				throw new NotFoundException(`Report not found: ${reportId}`)
			}

			return report as unknown as GeneratedReportRecord
		} catch (error) {
			this.logger.error(`Failed to fetch report ${reportId}: ${error}`)
			throw error
		}
	}

	async getFileBuffer(user_id: string, reportId: string): Promise<Buffer> {
		const report = await this.findOne(user_id, reportId)

		if (!report.filePath) {
			throw new NotFoundException(`File not found for report: ${reportId}`)
		}

		try {
			const buffer = await fs.readFile(report.filePath)
			return buffer
		} catch (error) {
			this.logger.error(`Failed to read file ${report.filePath}: ${error}`)
			throw new NotFoundException(`File not found: ${reportId}`)
		}
	}

	async delete(user_id: string, reportId: string): Promise<void> {
		const client = this.supabase.getAdminClient()

		try {
			// Get report first to delete file
			const report = await this.findOne(user_id, reportId)

			// Delete file if exists
			if (report.filePath) {
				try {
					await fs.unlink(report.filePath)
				} catch (error) {
					this.logger.warn(`Failed to delete file ${report.filePath}: ${error}`)
				}
			}

			// Delete database record
			const { error } = await client
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.from('generated_report' as any)
				.delete()
				.eq('id', reportId)
				.eq('user_id', user_id)

			if (error) {
				this.logger.error(
					`Failed to delete report ${reportId}: ${error.message}`
				)
				throw error
			}
		} catch (error) {
			this.logger.error(`Failed to delete report ${reportId}: ${error}`)
			throw error
		}
	}
}
