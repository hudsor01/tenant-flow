import {
	BadRequestException,
	Body,
	Controller,
	Post,
	Res
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiProduces,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Response } from 'express'
import { z } from 'zod'
import { ExportService } from './export.service'
import { AppLogger } from '../../logger/app-logger.service'

const exportRequestSchema = z
	.object({
		filename: z
			.string()
			.trim()
			.max(120, 'Filename must be 120 characters or fewer')
			.optional(),
		sheetName: z
			.string()
			.trim()
			.max(60, 'Sheet name must be 60 characters or fewer')
			.optional(),
		title: z
			.string()
			.trim()
			.max(160, 'Title must be 160 characters or fewer')
			.optional(),
		payload: z.unknown().optional(),
		data: z.unknown().optional()
	})
	.superRefine((value, ctx) => {
		if (value.payload === undefined && value.data === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'payload or data is required'
			})
		}
	})

type ExportRequestDto = z.infer<typeof exportRequestSchema>

/**
 * Report Export Controller
 *
 * Handles file export operations (Excel, CSV, PDF) for report data.
 * All endpoints accept data and return downloadable files.
 */
@ApiTags('Reports')
@ApiBearerAuth('supabase-auth')
@Controller('reports')
export class ReportExportController {
	constructor(
		private readonly exportService: ExportService,
		private readonly logger: AppLogger
	) {}

	private parseRequest(body: ExportRequestDto): ExportRequestDto {
		try {
			return exportRequestSchema.parse(body)
		} catch (error) {
			if (error instanceof z.ZodError) {
				const message = error.issues.map(issue => issue.message).join('; ')
				throw new BadRequestException(`Invalid export request: ${message}`)
			}
			throw error
		}
	}

	private sanitizeFilename(
		input: string | undefined,
		fallback: string,
		extension: string
	) {
		const lower = (input ?? fallback).toLowerCase()
		const baseName = lower.replace(/\.[a-z0-9]+$/, '')
		const replaced = [...baseName]
			.map(char => (/[a-z0-9-]/.test(char) ? char : '-'))
			.join('')
		const cleaned = replaced.replace(/-+/g, '-').replace(/^-|-$/g, '')
		const normalized = cleaned || fallback
		return `${normalized}.${extension}`
	}

	@ApiOperation({ summary: 'Export data as Excel', description: 'Generate Excel spreadsheet from provided data' })
	@ApiBody({ schema: { type: 'object', required: ['payload'], properties: { filename: { type: 'string' }, sheetName: { type: 'string' }, payload: { type: 'object' }, data: { type: 'object' } } } })
	@ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
	@ApiResponse({ status: 200, description: 'Excel file generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@Post('export/excel')
	async exportExcel(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const sheetName = (parsed.sheetName ?? 'Analytics').slice(0, 60)
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'xlsx')

		this.logger.log('Generating Excel export', {
			sheetName,
			filename
		})

		const buffer = await this.exportService.generateExcel(
			payload as Record<string, unknown> | Record<string, unknown>[],
			sheetName
		)

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

		res.send(buffer)
	}

	@ApiOperation({ summary: 'Export data as CSV', description: 'Generate CSV file from provided data' })
	@ApiBody({ schema: { type: 'object', required: ['payload'], properties: { filename: { type: 'string' }, payload: { type: 'object' }, data: { type: 'object' } } } })
	@ApiProduces('text/csv')
	@ApiResponse({ status: 200, description: 'CSV file generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@Post('export/csv')
	async exportCsv(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'csv')

		this.logger.log('Generating CSV export', { filename })

		const csv = await this.exportService.generateCSV(
			payload as Record<string, unknown> | Record<string, unknown>[]
		)

		res.setHeader('Content-Type', 'text/csv')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(csv)
	}

	@ApiOperation({ summary: 'Export data as PDF', description: 'Generate PDF document from provided data' })
	@ApiBody({ schema: { type: 'object', required: ['payload'], properties: { filename: { type: 'string' }, title: { type: 'string' }, payload: { type: 'object' }, data: { type: 'object' } } } })
	@ApiProduces('application/pdf')
	@ApiResponse({ status: 200, description: 'PDF file generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@Post('export/pdf')
	async exportPdf(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const title = (parsed.title ?? 'Analytics Export').slice(0, 160)
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'pdf')

		this.logger.log('Generating PDF export', { filename })

		const buffer = await this.exportService.generatePDF(
			payload as Record<string, unknown> | Record<string, unknown>[],
			title
		)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	}
}
