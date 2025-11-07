import {
	BadRequestException,
	Body,
	Controller,
	Get,
	InternalServerErrorException,
	Logger,
	Post,
	Query,
	Req
} from '@nestjs/common'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'
import type { LeaseTemplatePreviewRequest } from '@repo/shared/templates/lease-template'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { LeasesService } from './leases.service'

/**
 * Lease Generator Controller
 * Handles lease agreement generation and download
 */
@Controller('api/lease')
export class LeaseGeneratorController {
	private readonly logger = new Logger(LeaseGeneratorController.name)

	constructor(
		private readonly leasePDFService: LeasePDFService,
		private readonly leasesService: LeasesService
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
	async generateLease(@Body() leaseData: LeaseFormData) {
		this.logger.log(
			`Generating lease agreement for ${leaseData?.property?.address?.state} ${leaseData?.property?.type}`
		)

		try {
			// Validate required fields
			if (!leaseData?.property?.address?.state) {
				throw new BadRequestException('Property state is required')
			}
			if (!leaseData?.owner?.name) {
				throw new BadRequestException('Owner name is required')
			}
			if (!leaseData?.tenants?.length) {
				throw new BadRequestException('At least one tenant is required')
			}
			if (!leaseData?.leaseTerms?.rentAmount) {
				throw new BadRequestException('Rent amount is required')
			}

			// Generate the PDF using the service
			await this.leasePDFService.generateLeasePDF(
				leaseData as unknown as Record<string, unknown>
			)

			// Create a unique filename
			const timestamp = new Date().toISOString().slice(0, 10)
			const filename = `lease-agreement-${timestamp}-${Date.now()}.pdf`

			// In a production app, you would:
			// 1. Save the PDF to cloud storage (S3, Google Cloud Storage, etc.)
			// 2. Save lease record to database
			// 3. Handle billing/subscription limits
			// 4. Send notifications/emails

			return {
				success: true,
				lease: {
					id: `lease_${Date.now()}`,
					filename,
					downloadUrl: `/api/lease/download/${filename}`,
					previewUrl: `/api/lease/preview/${filename}`,
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
	@Get('download/:filename')
	async downloadLease(
		@Query('leaseId') leaseId: string | undefined,
		@Req() req: AuthenticatedRequest
	) {
		try {
			// Require leaseId to fetch real data
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

			// Fetch real lease data from database (RLS-protected)
			const leaseData = await this.leasesService.findOne(token, leaseId)
			if (!leaseData) {
				throw new BadRequestException(
					'Lease not found or you do not have access to this lease'
				)
			}

			// TODO: Transform database Lease model to LeaseFormData structure
			// This requires mapping property, owner, tenants, and lease terms
			// For now, this will error because structures don't match
			this.logger.warn(
				'Lease data transformation not yet implemented - database Lease model needs mapping to LeaseFormData',
				{ leaseId }
			)

			throw new InternalServerErrorException(
				'Lease PDF generation from database not yet implemented - data transformation layer needed'
			)

			// When transformation is implemented:
			// const transformedData = this.transformLeaseToFormData(leaseData)
			// const pdfBuffer = await this.leasePDFService.generateLeasePDF(transformedData)
			// reply.type('application/pdf')...
		} catch (error) {
			this.logger.error('Error downloading lease:', error)
			if (
				error instanceof BadRequestException ||
				error instanceof InternalServerErrorException
			) {
				throw error
			}
			throw new InternalServerErrorException('Failed to download lease')
		}
	}

	/**
	 * Preview a generated lease PDF (inline view)
	 */
	@Get('preview/:filename')
	async previewLease(
		@Query('leaseId') leaseId: string | undefined,
		@Req() req: AuthenticatedRequest
	) {
		try {
			// Require leaseId to fetch real data
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

			// Fetch real lease data from database (RLS-protected)
			const leaseData = await this.leasesService.findOne(token, leaseId)
			if (!leaseData) {
				throw new BadRequestException(
					'Lease not found or you do not have access to this lease'
				)
			}

			// TODO: Transform database Lease model to LeaseFormData structure
			this.logger.warn(
				'Lease data transformation not yet implemented - database Lease model needs mapping to LeaseFormData',
				{ leaseId }
			)

			throw new InternalServerErrorException(
				'Lease PDF generation from database not yet implemented - data transformation layer needed'
			)

			// When transformation is implemented:
			// const transformedData = this.transformLeaseToFormData(leaseData)
			// const pdfBuffer = await this.leasePDFService.generateLeasePDF(transformedData)
			// reply.type('application/pdf')...
		} catch (error) {
			this.logger.error('Error previewing lease:', error)
			if (
				error instanceof BadRequestException ||
				error instanceof InternalServerErrorException
			) {
				throw error
			}
			throw new InternalServerErrorException('Failed to preview lease')
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
			const errors: Array<{ field: string; message: string; code: string }> = []
			const warnings: Array<{
				field: string
				message: string
				suggestion: string
			}> = []

			// Basic validation
			if (!leaseData?.property?.address?.state) {
				errors.push({
					field: 'property.address.state',
					message: 'Property state is required',
					code: 'REQUIRED_FIELD'
				})
			}

			// State-specific validation (simplified)
			if (leaseData?.property?.address?.state === 'CA') {
				// California security deposit limit: 2x monthly rent
				const rentAmount = leaseData?.leaseTerms?.rentAmount || 0
				const depositAmount =
					leaseData?.leaseTerms?.securityDeposit?.amount || 0

				if (depositAmount > rentAmount * 2) {
					errors.push({
						field: 'leaseTerms.securityDeposit.amount',
						message:
							'Security deposit cannot exceed 2x monthly rent in California',
						code: 'CA_DEPOSIT_LIMIT'
					})
				}

				// California late fee grace period
				if (leaseData?.leaseTerms?.lateFee?.enabled) {
					const gracePeriod = leaseData.leaseTerms.lateFee.gracePeriod || 0
					if (gracePeriod < 3) {
						warnings.push({
							field: 'leaseTerms.lateFee.gracePeriod',
							message:
								'California recommends minimum 3-day grace period for late fees',
							suggestion: 'Increase grace period to 3 days'
						})
					}
				}
			}

			return {
				valid: errors.length === 0,
				errors,
				warnings,
				stateRequirements: this.getStateRequirements(
					leaseData?.property?.address?.state || 'CA'
				)
			}
		} catch (error) {
			this.logger.error('Error validating lease:', error)
			throw new InternalServerErrorException('Failed to validate lease data')
		}
	}

	/**
	 * Get simplified state requirements
	 */
	private getStateRequirements(state: string): {
		stateName: string
		securityDepositMax: string
		lateFeeGracePeriod: string
		requiredDisclosures: string[]
	} {
		const requirements: Record<
			string,
			{
				stateName: string
				securityDepositMax: string
				lateFeeGracePeriod: string
				requiredDisclosures: string[]
			}
		> = {
			CA: {
				stateName: 'California',
				securityDepositMax: '2x monthly rent',
				lateFeeGracePeriod: '3 days minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)', 'Bed Bug History']
			},
			TX: {
				stateName: 'Texas',
				securityDepositMax: '2x monthly rent',
				lateFeeGracePeriod: '1 day minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)']
			},
			NY: {
				stateName: 'New York',
				securityDepositMax: '1x monthly rent',
				lateFeeGracePeriod: '5 days minimum',
				requiredDisclosures: [
					'Lead Paint (pre-1978)',
					'Bed Bug Annual Statement'
				]
			}
		}

		const stateReq = requirements[state]
		if (stateReq) {
			return stateReq
		}

		return {
			stateName: state,
			securityDepositMax: 'Varies by state',
			lateFeeGracePeriod: 'Check state law',
			requiredDisclosures: ['Lead Paint (pre-1978)']
		}
	}
}
