/**
 * Lease PDF Controller
 *
 * Handles all Texas lease PDF generation endpoints:
 * - GET /leases/:id/pdf/missing-fields
 * - GET /leases/:id/pdf/preview
 * - POST /leases/:id/pdf/generate
 *
 * Extracted from LeasesController to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Request,
	Res,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiProduces,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeaseQueryService } from './lease-query.service'
import { SubmitMissingLeaseFieldsDto } from './dto/submit-missing-lease-fields.dto'
import { LeasePdfMapperService } from '../pdf/lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from '../pdf/lease-pdf-generator.service'

@ApiTags('Leases')
@ApiBearerAuth('supabase-auth')
@Controller('leases')
export class LeasePdfController {
	constructor(
		private readonly queryService: LeaseQueryService,
		private readonly pdfMapper: LeasePdfMapperService,
		private readonly pdfGenerator: LeasePdfGeneratorService
	) {}

	/**
	 * Get missing fields required for Texas lease PDF generation
	 * Returns which fields need to be filled by user (not auto-filled from DB)
	 */
	@ApiOperation({ summary: 'Get PDF missing fields', description: 'Get fields that need to be filled for lease PDF generation' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiResponse({ status: 200, description: 'Missing fields retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Lease not found or access denied' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get(':id/pdf/missing-fields')
	@Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
	async getPdfMissingFields(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		// Get complete lease data
		const leaseData = await this.queryService.getLeaseDataForPdf(token, id)

		// Validate lease data exists
		if (!leaseData?.lease) {
			throw new BadRequestException('Lease not found or access denied')
		}

		// Map to PDF fields
		const { fields, missing } = this.pdfMapper.mapLeaseToPdfFields(leaseData)

		return {
			lease_id: id,
			missing_fields: missing.fields,
			is_complete: missing.isComplete,
			auto_filled_count: Object.keys(fields).filter(
				k => fields[k as keyof typeof fields] !== undefined
			).length
		}
	}

	/**
	 * Preview filled Texas lease PDF as an inline PDF (no storage, no DocuSeal)
	 * Uses auto-filled DB data; missing fields render as empty/defaults.
	 */
	@ApiOperation({ summary: 'Preview lease PDF', description: 'Preview filled lease PDF with auto-filled DB data' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiProduces('application/pdf')
	@ApiResponse({ status: 200, description: 'PDF preview generated successfully' })
	@ApiResponse({ status: 400, description: 'Lease not found or access denied' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get(':id/pdf/preview')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 previews per minute
	async previewFilledPdf(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
		@Res() res: Response
	): Promise<void> {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const leaseData = await this.queryService.getLeaseDataForPdf(token, id)

		if (!leaseData?.lease) {
			throw new BadRequestException('Lease not found or access denied')
		}

		const { fields } = this.pdfMapper.mapLeaseToPdfFields(leaseData)
		const state = leaseData?.lease?.governing_state ?? undefined

		const pdfBuffer = await this.pdfGenerator.generateFilledPdf(fields, id, {
			state,
			validateTemplate: true
		})

		// Set security headers for PDF preview
		res.setHeader(
			'Content-Security-Policy',
			"default-src 'none'; frame-ancestors 'none';"
		)
		res.setHeader('X-Content-Type-Options', 'nosniff')
		res.setHeader('X-Frame-Options', 'DENY')

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `inline; filename="lease-${id}.pdf"`)
		res.setHeader('Content-Length', pdfBuffer.length)
		res.setHeader('Cache-Control', 'no-cache')
		res.send(pdfBuffer)
	}

	/**
	 * Submit missing fields and generate filled Texas lease PDF
	 * Returns PDF buffer for download or DocuSeal upload
	 */
	@ApiOperation({ summary: 'Generate lease PDF', description: 'Submit missing fields and generate filled lease PDF' })
	@ApiParam({ name: 'id', type: String, description: 'Lease UUID' })
	@ApiBody({ type: SubmitMissingLeaseFieldsDto })
	@ApiResponse({ status: 200, description: 'PDF generated successfully' })
	@ApiResponse({ status: 400, description: 'Lease not found or access denied' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post(':id/pdf/generate')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 PDF generations per minute
	async generateFilledPdf(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
		@Body() missingFieldsDto: SubmitMissingLeaseFieldsDto
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		// Get complete lease data
		const leaseData = await this.queryService.getLeaseDataForPdf(token, id)

		// Validate lease data exists
		if (!leaseData?.lease) {
			throw new BadRequestException('Lease not found or access denied')
		}

		// Map to PDF fields
		const { fields } = this.pdfMapper.mapLeaseToPdfFields(leaseData)

		// Merge user-provided fields with auto-filled fields
		const completeFields = this.pdfMapper.mergeMissingFields(
			fields,
			missingFieldsDto
		)

		// Generate filled PDF with state-specific template
		const state = leaseData?.lease?.governing_state ?? 'TX'
		const pdfBuffer = await this.pdfGenerator.generateFilledPdf(
			completeFields,
			id,
			{
				state,
				validateTemplate: true
			}
		)

		return {
			lease_id: id,
			pdf_size_bytes: pdfBuffer.length,
			generated_at: new Date().toISOString()
		}
	}
}
