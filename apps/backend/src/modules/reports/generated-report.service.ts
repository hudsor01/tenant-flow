import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'

export interface GeneratedReportData {
	userId: string
	reportType: string
	reportName: string
	format: 'pdf' | 'excel'
	startDate: string
	endDate: string
	fileBuffer?: Buffer
	metadata?: Record<string, unknown>
}

export interface GeneratedReportRecord {
	id: string
	userId: string
	reportType: string
	reportName: string
	format: string
	status: 'generating' | 'completed' | 'failed'
	fileUrl: string | null
	filePath: string | null
	fileSize: number | null
	startDate: string
	endDate: string
	metadata: Record<string, unknown>
	errorMessage: string | null
	createdAt: string
	updatedAt: string
}

@Injectable()
export class GeneratedReportService {
	private readonly logger = new Logger(GeneratedReportService.name)
	private readonly reportsDir = path.join(process.cwd(), 'reports')

	constructor(
		private readonly supabase: SupabaseService,
		private readonly queryHelpers: SupabaseQueryHelpers
	) {
		this.ensureReportsDirectory()
	}

	private async ensureReportsDirectory(): Promise<void> {
		try {
			await fs.mkdir(this.reportsDir, { recursive: true })
		} catch (error) {
			this.logger.error(`Failed to create reports directory: ${error}`)
		}
	}

	private async getUserDirectory(userId: string): Promise<string> {
		const userDir = path.join(this.reportsDir, userId)
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
				const userDir = await this.getUserDirectory(data.userId)
				filePath = path.join(userDir, filename)
				await fs.writeFile(filePath, data.fileBuffer)
				fileSize = data.fileBuffer.length
			}

			// Insert record into database
			return await this.queryHelpers.querySingle<GeneratedReportRecord>(
				client
					.from('generated_report')
					.insert({
						userId: data.userId,
						reportType: data.reportType,
						reportName: data.reportName,
						format: data.format,
						status: 'completed',
						filePath,
						fileSize,
						startDate: data.startDate,
						endDate: data.endDate,
						metadata: (data.metadata || {}) as never
					})
					.select()
					.single(),
				{
					resource: 'generated_report',
					operation: 'create',
					userId: data.userId
				}
			)
		} catch (error) {
			this.logger.error(`Report creation failed: ${error}`)
			throw error
		}
	}

	async findAll(
		userId: string,
		options?: { limit?: number; offset?: number }
	): Promise<{ reports: GeneratedReportRecord[]; total: number }> {
		const client = this.supabase.getAdminClient()
		const limit = options?.limit || 20
		const offset = options?.offset || 0

		try {
			// Get total count and paginated records in parallel
			const [count, reports] = await Promise.all([
				this.queryHelpers.queryCount(
					client
						.from('generated_report')
						.select('*', { count: 'exact', head: true })
						.eq('userId', userId),
					{
						resource: 'generated_report',
						operation: 'count',
						userId
					}
				),
				this.queryHelpers.queryList<GeneratedReportRecord>(
					client
						.from('generated_report')
						.select('*')
						.eq('userId', userId)
						.order('createdAt', { ascending: false })
						.range(offset, offset + limit - 1),
					{
						resource: 'generated_report',
						operation: 'findAll',
						userId
					}
				)
			])

			return {
				reports,
				total: count
			}
		} catch (error) {
			this.logger.error(`Failed to fetch reports: ${error}`)
			throw error
		}
	}

	async findOne(
		userId: string,
		reportId: string
	): Promise<GeneratedReportRecord> {
		const client = this.supabase.getAdminClient()

		try {
			return await this.queryHelpers.querySingle<GeneratedReportRecord>(
				client
					.from('generated_report')
					.select('*')
					.eq('id', reportId)
					.eq('userId', userId)
					.single(),
				{
					resource: 'generated_report',
					id: reportId,
					operation: 'findOne',
					userId
				}
			)
		} catch (error) {
			this.logger.error(`Failed to fetch report ${reportId}: ${error}`)
			throw error
		}
	}

	async getFileBuffer(userId: string, reportId: string): Promise<Buffer> {
		const report = await this.findOne(userId, reportId)

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

	async delete(userId: string, reportId: string): Promise<void> {
		const client = this.supabase.getAdminClient()

		try {
			// Get report first to delete file
			const report = await this.findOne(userId, reportId)

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
				.from('generated_report')
				.delete()
				.eq('id', reportId)
				.eq('userId', userId)

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
