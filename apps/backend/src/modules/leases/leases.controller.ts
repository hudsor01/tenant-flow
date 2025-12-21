/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS

 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	Header,
	NotFoundException,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req,
	Res
} from '@nestjs/common'
import type { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeasesService } from './leases.service'
import { LeaseFinancialService } from './lease-financial.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { LeaseSignatureService } from './lease-signature.service'
import { CreateLeaseDto } from './dto/create-lease.dto'
import { UpdateLeaseDto } from './dto/update-lease.dto'
import { FindAllLeasesDto } from './dto/find-all-leases.dto'
import { SubmitMissingLeaseFieldsDto } from './dto/submit-missing-lease-fields.dto'
import { isValidUUID } from '@repo/shared/validation/common'
import { LeasePdfMapperService } from '../pdf/lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from '../pdf/lease-pdf-generator.service'

@Controller('leases')
export class LeasesController {
	constructor(
		private readonly leasesService: LeasesService,
		private readonly financialService: LeaseFinancialService,
		private readonly lifecycleService: LeaseLifecycleService,
		private readonly signatureService: LeaseSignatureService,
		private readonly pdfMapper: LeasePdfMapperService,
		private readonly pdfGenerator: LeasePdfGeneratorService
	) {}

	@Get()
	async findAll(
		@JwtToken() token: string,
		@Query() query: FindAllLeasesDto
	) {
		// DTO validation handles all parameter validation via Zod schema
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		const data = await this.leasesService.findAll(token, { ...query })

		// Return PaginatedResponse format expected by frontend
		return {
			...data,
			hasMore: data.data.length >= data.limit
		}
	}

	@Get('stats')
	async getStats(@JwtToken() token: string) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getStats(token)
	}

	@Get('analytics/performance')
	async getLeasePerformanceAnalytics(
		@JwtToken() token: string,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('90d')) timeframe?: string
	) {
		// Validate UUIDs if provided
		if (lease_id && !isValidUUID(lease_id)) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['30d', '90d', '6m', '1y'].includes(timeframe ?? '90d')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 30d, 90d, 6m, 1y'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(lease_id ? { lease_id } : {}),
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '90d'
		})
	}

	@Get('analytics/duration')
	async getLeaseDurationAnalytics(
		@JwtToken() token: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('yearly')) period?: string
	) {
		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['monthly', 'quarterly', 'yearly'].includes(period ?? 'yearly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: monthly, quarterly, yearly'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(property_id ? { property_id } : {}),
			timeframe: '90d',
			period: period ?? 'yearly'
		})
	}

	@Get('analytics/turnover')
	async getLeaseTurnoverAnalytics(
		@JwtToken() token: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate property_id if provided
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['6m', '12m', '24m', '36m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 6m, 12m, 24m, 36m'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	@Get('analytics/revenue')
	async getLeaseRevenueAnalytics(
		@JwtToken() token: string,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate UUIDs if provided
		if (lease_id && !isValidUUID(lease_id)) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (property_id && !isValidUUID(property_id)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['weekly', 'monthly', 'quarterly'].includes(period ?? 'monthly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: weekly, monthly, quarterly'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(lease_id ? { lease_id } : {}),
			...(property_id ? { property_id } : {}),
			timeframe: '90d',
			period: period ?? 'monthly'
		})
	}

	@Get('expiring')
	async getExpiring(
		@JwtToken() token: string,
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	) {
		if (days && (days < 1 || days > 365)) {
			throw new BadRequestException('Days must be between 1 and 365')
		}
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getExpiring(token, days ?? 30)
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		const lease = await this.leasesService.findOne(token, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	async create(@Body() dto: CreateLeaseDto, @JwtToken() token: string) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.create(token, dto)
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateLeaseDto,
		@JwtToken() token: string
	) {
		//Pass version for optimistic locking
		const lease = await this.leasesService.update(token, id, dto)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		await this.leasesService.remove(token, id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('end_date') end_date: string,
		@JwtToken() token: string
	) {
		// Validate date format
		if (!end_date || !end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
		}
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.lifecycleService.renew(token, id, end_date)
	}

	@Post(':id/terminate')
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('reason') reason?: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.lifecycleService.terminate(
			token,
			id,
			new Date().toISOString(),
			reason
		)
	}

	// ============================================================
	// LEASE SIGNATURE WORKFLOW ENDPOINTS
	// ============================================================

	/**
	 * Owner sends lease for signature (draft -> pending_signature)
	 * Generates PDF and creates e-signature request if DocuSeal is configured
	 */
	@Post(':id/send-for-signature')
	@Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 sends per hour
	async sendForSignature(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Body()
		body?: {
			message?: string
			missingFields?: {
				immediate_family_members?: string
				landlord_notice_address?: string
			}
		}
	) {
		const options: {
			token: string
			message?: string
			missingFields?: {
				immediate_family_members?: string
				landlord_notice_address?: string
			}
		} = { token }

		if (body?.message !== undefined) options.message = body.message
		if (body?.missingFields !== undefined) options.missingFields = body.missingFields

		await this.signatureService.sendForSignature(req.user.id, id, options)
		return { success: true }
	}

	/**
	 * Owner signs the lease
	 */
	@Post(':id/sign/owner')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 signature attempts per hour
	async signAsOwner(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signatureIp = req.ip || 'unknown'
		await this.signatureService.signLeaseAsOwner(req.user.id, id, signatureIp)
		return { success: true }
	}

	/**
	 * Tenant signs the lease
	 */
	@Post(':id/sign/tenant')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 signature attempts per hour
	async signAsTenant(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signatureIp = req.ip || 'unknown'
		await this.signatureService.signLeaseAsTenant(req.user.id, id, signatureIp)
		return { success: true }
	}

	/**
	 * Get signature status for a lease
	 * Authorization: Only owner or assigned tenant can view
	 *
	 * Note: SSE provides real-time updates. This endpoint is now
	 * a fallback for missed events or initial page load only.
	 */
	@Get(':id/signature-status')
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute (fallback only, SSE is primary)
	@Header('Cache-Control', 'private, max-age=30') // 30s cache for CDN/browser
	async getSignatureStatus(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		return this.signatureService.getSignatureStatus(id, req.user.id)
	}

	/**
	 * Get DocuSeal signing URL for the current user
	 * Returns embed URL for e-signature if DocuSeal submission exists
	 */
	@Get(':id/signing-url')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
	async getSigningUrl(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signingUrl = await this.signatureService.getSigningUrl(
			id,
			req.user.id
		)
		return { signing_url: signingUrl }
	}

	/**
	 * Cancel/revoke signature request
	 * Reverts lease to draft status and archives DocuSeal submission
	 */
	@Post(':id/cancel-signature')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 cancellations per hour
	async cancelSignatureRequest(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		await this.signatureService.cancelSignatureRequest(req.user.id, id)
		return { success: true }
	}

	@Post(':id/resend-signature')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 resends per hour
	async resendSignatureRequest(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body() body?: { message?: string }
	) {
		// Build options object only with defined values for exactOptionalPropertyTypes
		const options: { message?: string } = {}
		if (body?.message !== undefined) {
			options.message = body.message
		}
		await this.signatureService.resendSignatureRequest(req.user.id, id, options)
		return { success: true }
	}

	/**
	 * Get signed document URL for download
	 * Only available for active leases with completed signatures
	 */
	@Get(':id/signed-document')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
	async getSignedDocument(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const documentUrl = await this.signatureService.getSignedDocumentUrl(
			id,
			req.user.id
		)
		return { document_url: documentUrl }
	}

	// ============================================================
	// TEXAS LEASE PDF GENERATION ENDPOINTS
	// ============================================================

	/**
	 * Get missing fields required for Texas lease PDF generation
	 * Returns which fields need to be filled by user (not auto-filled from DB)
	 */
	@Get(':id/pdf/missing-fields')
	@Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
	async getPdfMissingFields(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		// Get complete lease data
		const leaseData = await this.leasesService.getLeaseDataForPdf(token, id)

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
	@Get(':id/pdf/preview')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 previews per minute
	async previewFilledPdf(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Res() res: Response
	): Promise<void> {
		const leaseData = await this.leasesService.getLeaseDataForPdf(token, id)

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
		res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';")
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
	@Post(':id/pdf/generate')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 PDF generations per minute
	async generateFilledPdf(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body() missingFieldsDto: SubmitMissingLeaseFieldsDto
	) {
		// Get complete lease data
		const leaseData = await this.leasesService.getLeaseDataForPdf(token, id)

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
		const pdfBuffer = await this.pdfGenerator.generateFilledPdf(completeFields, id, {
			state,
			validateTemplate: true
		})

		return {
			lease_id: id,
			pdf_size_bytes: pdfBuffer.length,
			generated_at: new Date().toISOString()
		}
	}
}
