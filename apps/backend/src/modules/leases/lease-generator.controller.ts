import {
	BadRequestException,
	Body,
	Controller,
	Get,
	InternalServerErrorException,
	Logger,
	Post,
	Query,
	Req,
	UseInterceptors,
	UseFilters
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { UserId } from '../../shared/decorators/user.decorator'
import { randomUUID } from 'node:crypto'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'
import type { LeaseTemplatePreviewRequest } from '@repo/shared/templates/lease-template'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { LeasesService } from './leases.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import {
	PdfResponseInterceptor,
	type PdfResponse
} from '../../shared/interceptors/pdf-response.interceptor'
import { DatabaseExceptionFilter } from '../../shared/filters/database-exception.filter'

/**
 * Lease Generator Controller
 * Handles lease agreement generation and download
 */
@Controller('api/lease')
export class LeaseGeneratorController {
	private readonly logger = new Logger(LeaseGeneratorController.name)

	constructor(
		private readonly leasePDFService: LeasePDFService,
		private readonly leasesService: LeasesService,
		private readonly transformationService: LeaseTransformationService,
		private readonly validationService: LeaseValidationService
	) {}

	@Post('template/preview')
	async previewTemplate(@Body() payload: LeaseTemplatePreviewRequest) {
		this.logger.log(
			`Previewing lease template for state ${payload.selections.state}`
		)
		const pdfBuffer = await this.leasePDFService.generateLeasePdfFromTemplate(
			payload.selections,
			payload.context
		)
		return {
			success: true,
			mimeType: 'application/pdf',
			pdf: pdfBuffer.toString('base64')
		}
	}

	/**
	 * Generate a new lease agreement PDF
	 */
	@Post('generate')
	async generateLease(
		@JwtToken() token: string,
		@UserId() userId: string,
		@Body() leaseData: LeaseFormData
	) {
		this.logger.log(
			`Generating lease agreement for ${leaseData?.property?.address?.state} ${leaseData?.property?.type}`
		)

		try {
			// Use validation service
			this.validationService.validateRequiredFields(leaseData)
			const { startDate, endDate } = this.validationService.validateDates(leaseData)

			// Generate the PDF using the service to validate LeaseFormData
			await this.leasePDFService.generateLeasePDF(
				leaseData as unknown as Record<string, unknown>
			)

			// Create a unique ID for this lease using crypto.randomUUID() to prevent collisions
			const leaseId = `lease_${randomUUID()}`
			const timestamp = new Date().toISOString().slice(0, 10)
			const filename = `lease-agreement-${timestamp}-${randomUUID()}.pdf`

			// TODO: Save PDF to cloud storage (S3, Supabase Storage, etc.)
			// For now, PDF is generated on-demand from database lease record
			const documentUrl = `/api/lease/download?leaseId=${leaseId}`

			// Persist lease record to database
			const client = this.leasesService.getUserClient(token)

			// Store complete LeaseFormData as JSON in terms field for PDF regeneration
			const termsJson = JSON.stringify(leaseData)

			// Insert lease record
			const { data: newLease, error: insertError } = await client
				.from('lease')
				.insert({
					id: leaseId,
					tenantId: '',
					unitId: null,
					propertyId: null,
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
					rentAmount: leaseData.leaseTerms.rentAmount,
					monthlyRent: leaseData.leaseTerms.rentAmount,
					securityDeposit: leaseData.leaseTerms.securityDeposit.amount || 0,
					status: 'DRAFT',
					terms: termsJson,
					lease_document_url: documentUrl,
					gracePeriodDays: leaseData.leaseTerms.lateFee?.gracePeriod || null,
					lateFeeAmount: leaseData.leaseTerms.lateFee?.enabled
						? leaseData.leaseTerms.lateFee.amount || null
						: null,
					lateFeePercentage: leaseData.leaseTerms.lateFee?.enabled
						? leaseData.leaseTerms.lateFee.percentage || null
						: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					version: 1
				})
				.select()
				.single()

			if (insertError || !newLease) {
				this.logger.error('Failed to persist lease record', {
					leaseId,
					error: insertError?.message
				})
				throw new InternalServerErrorException(
					'Failed to save lease record to database'
				)
			}

			this.logger.log('Successfully persisted lease record', {
				leaseId,
				userId
			})

			return {
				success: true,
				lease: {
					id: leaseId,
					filename,
					downloadUrl: `/api/lease/download?leaseId=${leaseId}`,
					previewUrl: `/api/lease/preview?leaseId=${leaseId}`,
					generatedAt: new Date().toISOString(),
					state: leaseData.property.address.state,
					propertyAddress: `${leaseData.property.address.street}${leaseData.property.address.unit ? `, ${leaseData.property.address.unit}` : ''}, ${leaseData.property.address.city}, ${leaseData.property.address.state}`,
					monthlyRent: leaseData.leaseTerms.rentAmount / 100,
					tenantCount: leaseData.tenants.length
				}
			}
		} catch (error) {
			this.logger.error('Error generating lease:', error)

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new InternalServerErrorException(
				'Failed to generate lease agreement'
			)
		}
	}

	/**
	 * Download a generated lease PDF
	 */
	@Get('download')
	@UseInterceptors(PdfResponseInterceptor)
	@UseFilters(DatabaseExceptionFilter)
	async downloadLease(
		@Query('leaseId') leaseId: string | undefined,
		@Req() req: AuthenticatedRequest
	): Promise<PdfResponse> {
		// Validate parameters
		if (!leaseId) {
			throw new BadRequestException(
				'leaseId query parameter is required to generate lease PDF'
			)
		}

		// Get authentication token from request
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		// Use transformation service
		const leaseFormData = await this.transformationService.buildLeaseFormData(
			token,
			leaseId
		)

		this.logger.log('Generating PDF for lease', {
			leaseId,
			tenantCount: leaseFormData.tenants.length,
			propertyState: leaseFormData.property.address.state
		})

		// Generate PDF
		const pdfBuffer = await this.leasePDFService.generateLeasePDF(
			leaseFormData as unknown as Record<string, unknown>
		)

		// Return PDF response (interceptor will set headers)
		return {
			success: true,
			contentType: 'application/pdf',
			disposition: 'attachment',
			filename: `lease-${leaseId}.pdf`,
			buffer: pdfBuffer
		}
	}

	/**
	 * Preview a generated lease PDF (inline view)
	 */
	@Get('preview')
	@UseInterceptors(PdfResponseInterceptor)
	@UseFilters(DatabaseExceptionFilter)
	async previewLease(
		@Query('leaseId') leaseId: string | undefined,
		@Req() req: AuthenticatedRequest
	): Promise<PdfResponse> {
		// Validate parameters
		if (!leaseId) {
			throw new BadRequestException(
				'leaseId query parameter is required to generate lease PDF'
			)
		}

		// Get authentication token from request
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authentication token is required')
		}

		// Use transformation service
		const leaseFormData = await this.transformationService.buildLeaseFormData(
			token,
			leaseId
		)

		this.logger.log('Generating PDF preview for lease', {
			leaseId,
			tenantCount: leaseFormData.tenants.length,
			propertyState: leaseFormData.property.address.state
		})

		// Generate PDF
		const pdfBuffer = await this.leasePDFService.generateLeasePDF(
			leaseFormData as unknown as Record<string, unknown>
		)

		// Return PDF response (interceptor will set headers)
		return {
			success: true,
			contentType: 'application/pdf',
			disposition: 'inline',
			filename: `lease-${leaseId}.pdf`,
			buffer: pdfBuffer
		}
	}

	/**
	 * Validate lease data against state requirements
	 */
	@Post('validate')
	async validateLease(@Body() leaseData: LeaseFormData) {
		this.logger.log(
			`Validating lease data for ${leaseData?.property?.address?.state}`
		)

		try {
			// Use validation service
			return this.validationService.validateLeaseData(leaseData)
		} catch (error) {
			this.logger.error('Error validating lease:', error)
			throw new InternalServerErrorException('Failed to validate lease data')
		}
	}
}