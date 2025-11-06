import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	Param,
	Post,
	Res
} from '@nestjs/common'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'
import type { LeaseTemplatePreviewRequest } from '@repo/shared/templates/lease-template'
import type { Response } from 'express'
import { LeasePDFService } from '../pdf/lease-pdf.service'

/**
 * Lease Generator Controller
 * Handles lease agreement generation and download
 */
@Controller('api/lease')
export class LeaseGeneratorController {
	private readonly logger = new Logger(LeaseGeneratorController.name)

	constructor(private readonly leasePDFService: LeasePDFService) {}

	@Post('template/preview')
	async previewTemplate(@Body() payload: LeaseTemplatePreviewRequest) {
		this.logger.log(`Previewing lease template for state ${payload.selections.state}`)
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
		@Param('filename') filename: string,
		@Res() reply: Response
	) {
		try {
			// In production, you would:
			// 1. Verify user has access to this lease
			// 2. Retrieve PDF from cloud storage
			// 3. Log download activity
			// 4. Handle download limits

			// For demo purposes, generate a sample PDF
			const sampleLeaseData = this.getSampleLeaseData()
			const pdfBuffer =
				await this.leasePDFService.generateLeasePDF(sampleLeaseData)

			reply
				.type('application/pdf')
				.header('Content-Disposition', `attachment; filename="${filename}"`)
				.header('Content-Length', pdfBuffer.length.toString())
				.status(HttpStatus.OK)
				.send(pdfBuffer)
		} catch (error) {
			this.logger.error('Error downloading lease:', error)
			throw new InternalServerErrorException('Failed to download lease')
		}
	}

	/**
	 * Preview a generated lease PDF (inline view)
	 */
	@Get('preview/:filename')
	async previewLease(
		@Param('filename') filename: string,
		@Res() reply: Response
	) {
		try {
			// Generate sample PDF for preview
			const sampleLeaseData = this.getSampleLeaseData()
			const pdfBuffer =
				await this.leasePDFService.generateLeasePDF(sampleLeaseData)

			reply
				.type('application/pdf')
				.header('Content-Disposition', `inline; filename="${filename}"`)
				.header('Content-Length', pdfBuffer.length.toString())
				.status(HttpStatus.OK)
				.send(pdfBuffer)
		} catch (error) {
			this.logger.error('Error previewing lease:', error)
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
	 * Get sample lease data for demo purposes
	 */
	private getSampleLeaseData() {
		return {
			property: {
				address: {
					street: '123 Demo Street',
					unit: 'Apt 1A',
					city: 'San Francisco',
					state: 'CA',
					zipCode: '94102'
				},
				type: 'apartment',
				bedrooms: 2,
				bathrooms: 1
			},
			owner: {
				name: 'Demo Property Management LLC',
				isEntity: true,
				entityType: 'LLC',
				address: {
					street: '456 Business Ave',
					city: 'San Francisco',
					state: 'CA',
					zipCode: '94103'
				},
				phone: '(415) 555-0123',
				email: 'demo@properties.com'
			},
			tenants: [
				{
					name: 'John Doe',
					email: 'john@example.com',
					phone: '(415) 555-7890',
					isMainTenant: true
				}
			],
			leaseTerms: {
				type: 'fixed_term',
				startDate: '2024-03-01',
				endDate: '2025-02-28',
				rentAmount: 300000, // $3000 in cents
				currency: 'USD',
				dueDate: 1,
				lateFee: {
					enabled: true,
					amount: 10000, // $100 in cents
					gracePeriod: 5
				},
				securityDeposit: {
					amount: 300000, // $3000 in cents
					monthsRent: 1
				}
			}
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
