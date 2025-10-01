import {
	BadRequestException,
	Body,
	Controller,
	Logger,
	Post,
	Res
} from '@nestjs/common'
import type { Response } from 'express'
import { z } from 'zod'
import { ExportService } from './export.service'

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

@Controller('reports')
export class ReportsController {
	private readonly logger = new Logger(ReportsController.name)

	constructor(private readonly exportService: ExportService) {}

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

		const buffer = await this.exportService.generateExcel(payload, sheetName)

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

		res.send(buffer)
	}

	@Post('export/csv')
	async exportCsv(
		@Body() body: ExportRequestDto,
		@Res({ passthrough: true }) res: Response
	) {
		const parsed = this.parseRequest(body)
		const payload = parsed.payload ?? parsed.data
		const filename = this.sanitizeFilename(parsed.filename, 'analytics', 'csv')

		this.logger.log('Generating CSV export', { filename })

		const csv = await this.exportService.generateCSV(payload)

		res.setHeader('Content-Type', 'text/csv')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(csv)
	}

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

		const buffer = await this.exportService.generatePDF(payload, title)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	}
}
