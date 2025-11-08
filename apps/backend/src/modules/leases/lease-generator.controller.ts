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
import type {
	LeaseFormData,
	LeaseTermType,
	USState
} from '@repo/shared/types/lease-generator.types'
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

			// Create a unique ID for this lease
			const leaseId = `lease_${Date.now()}`
			const timestamp = new Date().toISOString().slice(0, 10)
			const filename = `lease-agreement-${timestamp}-${Date.now()}.pdf`

			// In a production app, you would:
			// 1. Save the PDF to cloud storage (S3, Google Cloud Storage, etc.)
			// 2. Save lease record to database with the generated leaseId
			// 3. Handle billing/subscription limits
			// 4. Send notifications/emails

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

			const leaseFormData = await this.buildLeaseFormData(token, leaseId)

			this.logger.log('Generating PDF for lease', {
				leaseId,
				tenantCount: leaseFormData.tenants.length,
				propertyState: leaseFormData.property.address.state
			})

			// Generate PDF
			const pdfBuffer = await this.leasePDFService.generateLeasePDF(
				leaseFormData as unknown as Record<string, unknown>
			)

			// Return PDF for download
			return {
				success: true,
				contentType: 'application/pdf',
				disposition: 'attachment',
				filename: `lease-${leaseId}.pdf`,
				buffer: pdfBuffer
			}

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
	@Get('preview')
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

			const leaseFormData = await this.buildLeaseFormData(token, leaseId)

			this.logger.log('Generating PDF preview for lease', {
				leaseId,
				tenantCount: leaseFormData.tenants.length,
				propertyState: leaseFormData.property.address.state
			})

			// Generate PDF
			const pdfBuffer = await this.leasePDFService.generateLeasePDF(
				leaseFormData as unknown as Record<string, unknown>
			)

			// Return PDF for inline preview
			return {
				success: true,
				contentType: 'application/pdf',
				disposition: 'inline',
				filename: `lease-${leaseId}.pdf`,
				buffer: pdfBuffer
			}
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

	/**
	 * Build LeaseFormData either from full relational data or fallback JSON terms.
	 */
	private async buildLeaseFormData(
		token: string,
		leaseId: string
	): Promise<LeaseFormData> {
		try {
			// Try to fetch lease with all relations first
			const leaseWithRelations = await this.fetchLeaseWithRelations(
				token,
				leaseId
			)
			return this.transformLeaseWithRelationsToFormData(leaseWithRelations)
		} catch (error) {
			this.logger.warn(
				'Failed to fetch lease with relations, falling back to basic lease data',
				{
					leaseId,
					error: error instanceof Error ? error.message : String(error)
				}
			)

			// Fallback: fetch basic lease and use transformLeaseToFormData
			try {
				const client = this.leasesService.getUserClient(token)
				const { data: basicLease, error: basicError } = await client
					.from('lease')
					.select('*')
					.eq('id', leaseId)
					.single()

				if (basicError || !basicLease) {
					this.logger.error('Failed to fetch basic lease data', {
						leaseId,
						error: basicError?.message
					})
					throw new BadRequestException('Failed to fetch lease data')
				}

				return this.transformLeaseToFormData(basicLease)
			} catch (fallbackError) {
				this.logger.error(
					'Failed to fetch basic lease data for PDF generation',
					{
						leaseId,
						error:
							fallbackError instanceof Error
								? fallbackError.message
								: String(fallbackError)
					}
				)

				throw new InternalServerErrorException(
					'Failed to fetch lease data for PDF generation'
				)
			}
		}
	}

	/**
	 * Fetch lease with all related data (property, unit, tenant, owner)
	 * Used for transforming database Lease to LeaseFormData structure
	 */
	private async fetchLeaseWithRelations(token: string, leaseId: string) {
		const client = this.leasesService.getUserClient(token)

		// Fetch lease with related data in a single query
		const { data, error } = await client
			.from('lease')
			.select(
				`
				*,
				unit:unit_id (
					*,
					property:property_id (
						*,
						owner:user_id (
							id,
							email,
							name,
							phone
						)
					)
				),
				tenant:tenant_id (
					*
				)
			`
			)
			.eq('id', leaseId)
			.single()

		if (error || !data) {
			this.logger.error('Failed to fetch lease with relations', {
				leaseId,
				error: error?.message
			})
			throw new BadRequestException('Failed to fetch lease data')
		}

		return data
	}

	/**
	 * Transform fetched lease with relations to LeaseFormData structure
	 */
	private transformLeaseWithRelationsToFormData(
		leaseWithRelations: Record<string, unknown>
	): LeaseFormData {
		const lease = leaseWithRelations as {
			id: string
			startDate: string
			endDate: string
			rentAmount: number
			securityDeposit: number
			status: string
			terms: string | null
			unit: {
				id: string
				unitNumber: string
				bedrooms: number
				bathrooms: number
				squareFeet: number | null
				property: {
					id: string
					name: string
					address: string
					city: string
					state: string
					zipCode: string
					propertyType: string
					owner: {
						id: string
						email: string
						name: string | null
						phone: string | null
					}
				}
			}
			tenant: {
				id: string
				name: string
				email: string
				phone: string | null
			}
		}

		// Map property type from database enum to LeaseFormData type
		const propertyTypeMap: Record<string, LeaseFormData['property']['type']> =
			{
				SINGLE_FAMILY: 'single_family_home',
				APARTMENT: 'apartment',
				CONDO: 'condo',
				TOWNHOUSE: 'townhouse',
				MULTI_UNIT: 'duplex',
				COMMERCIAL: 'commercial',
				OTHER: 'apartment' // Default fallback
			}

		const property = lease.unit.property
		const owner = property.owner
		const tenant = lease.tenant
		const unit = lease.unit

		// Parse address (assuming format: "street, city, state zipCode")
		const addressParts = property.address.split(',').map((s) => s.trim())
		const street = addressParts[0] || property.address

		// Build property address object with proper optional handling
		const propertyAddress: LeaseFormData['property']['address'] = {
			street,
			city: property.city,
			state: property.state as USState,
			zipCode: property.zipCode
		}

		// Add unit if present
		if (unit.unitNumber) {
			propertyAddress.unit = unit.unitNumber
		}

		// Build property object with proper optional handling
		const propertyData: LeaseFormData['property'] = {
			address: propertyAddress,
			type:
				propertyTypeMap[property.propertyType] ||
				('apartment' as LeaseFormData['property']['type']),
			bedrooms: unit.bedrooms || 1,
			bathrooms: unit.bathrooms || 1,
			parking: {
				included: false
			},
			amenities: []
		}

		// Add optional squareFeet if present
		if (unit.squareFeet) {
			propertyData.squareFeet = unit.squareFeet
		}

		// Build owner object with proper optional handling
		const ownerData: LeaseFormData['owner'] = {
			name: owner.name || owner.email,
			isEntity: false,
			address: {
				street: property.address,
				city: property.city,
				state: property.state as USState,
				zipCode: property.zipCode
			},
			phone: owner.phone || '',
			email: owner.email
		}

		// Build lease terms with proper optional handling
		const leaseTermsData: LeaseFormData['leaseTerms'] = {
			type: 'fixed_term' as LeaseTermType,
			startDate: lease.startDate,
			rentAmount: lease.rentAmount,
			currency: 'USD',
			dueDate: 1,
			lateFee: {
				enabled: false
			},
			securityDeposit: {
				amount: lease.securityDeposit || 0,
				monthsRent: 1
			}
		}

		// Add optional endDate if present
		if (lease.endDate) {
			leaseTermsData.endDate = lease.endDate
		}

		const leaseFormData: LeaseFormData = {
			property: propertyData,
			owner: ownerData,
			tenants: [
				{
					name: tenant.name,
					email: tenant.email,
					phone: tenant.phone || '',
					isMainTenant: true
				}
			],
			leaseTerms: leaseTermsData,
			options: {
				includeStateDisclosures: true,
				includeFederalDisclosures: true,
				includeSignaturePages: true,
				format: 'standard'
			}
		}

		return leaseFormData
	}

	/**
	 * Parse structured lease terms from JSON string
	 * Fallback method when relational data is unavailable
	 */
	private parseStructuredLeaseTerms(
		termsJson: string | null
	): Partial<LeaseFormData> | null {
		if (!termsJson) {
			return null
		}

		try {
			const parsed = JSON.parse(termsJson)
			return parsed as Partial<LeaseFormData>
		} catch (error) {
			this.logger.warn('Failed to parse lease terms JSON', {
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	/**
	 * Transform basic lease data to LeaseFormData using parsed terms
	 * Fallback method when relational query fails
	 */
	private transformLeaseToFormData(
		lease: Record<string, unknown>
	): LeaseFormData {
		const leaseData = lease as {
			id: string
			startDate: string
			endDate: string
			rentAmount: number
			securityDeposit: number
			status: string
			terms: string | null
		}

		// Parse structured terms
		const structuredTerms = this.parseStructuredLeaseTerms(leaseData.terms)

		// Fallback to minimal valid data if terms parsing fails
		const fallbackPropertyState: USState = 'CA'
		const ownerState: USState =
			(structuredTerms?.owner?.address?.state as USState) ??
			fallbackPropertyState

		// Build property object with proper optional handling
		const property: LeaseFormData['property'] = {
			address: {
				street: structuredTerms?.property?.address?.street ?? 'Unknown Street',
				...(structuredTerms?.property?.address?.unit
					? { unit: structuredTerms.property.address.unit }
					: {}),
				city: structuredTerms?.property?.address?.city ?? 'Unknown City',
				state:
					(structuredTerms?.property?.address?.state as USState) ??
					fallbackPropertyState,
				zipCode: structuredTerms?.property?.address?.zipCode ?? '00000'
			},
			type: structuredTerms?.property?.type ?? 'apartment',
			bedrooms: structuredTerms?.property?.bedrooms ?? 1,
			bathrooms: structuredTerms?.property?.bathrooms ?? 1,
			...(structuredTerms?.property?.squareFeet
				? { squareFeet: structuredTerms.property.squareFeet }
				: {}),
			parking: {
				included: structuredTerms?.property?.parking?.included ?? false,
				...(structuredTerms?.property?.parking?.spaces
					? { spaces: structuredTerms.property.parking.spaces }
					: {}),
				...(structuredTerms?.property?.parking?.monthly_fee
					? { monthly_fee: structuredTerms.property.parking.monthly_fee }
					: {})
			},
			amenities: structuredTerms?.property?.amenities ?? []
		}

		// Build owner object with proper optional handling
		const owner: LeaseFormData['owner'] = {
			name: structuredTerms?.owner?.name ?? 'Property Owner',
			isEntity: structuredTerms?.owner?.isEntity ?? false,
			...(structuredTerms?.owner?.entityType
				? { entityType: structuredTerms.owner.entityType }
				: {}),
			address: {
				street:
					structuredTerms?.owner?.address?.street ?? property.address.street,
				city: structuredTerms?.owner?.address?.city ?? property.address.city,
				state: ownerState,
				zipCode:
					structuredTerms?.owner?.address?.zipCode ?? property.address.zipCode
			},
			phone: structuredTerms?.owner?.phone ?? '',
			email: structuredTerms?.owner?.email ?? '',
			...(structuredTerms?.owner?.agent
				? { agent: structuredTerms.owner.agent }
				: {})
		}

		// Build tenants array with proper optional handling
		const tenants: LeaseFormData['tenants'] =
			structuredTerms?.tenants && structuredTerms.tenants.length > 0
				? structuredTerms.tenants
				: [
						{
							name: 'Tenant Name',
							email: 'tenant@example.com',
							phone: '',
							isMainTenant: true
						}
					]

		// Build lease terms with proper optional handling
		const leaseTerms: LeaseFormData['leaseTerms'] = {
			type:
				(structuredTerms?.leaseTerms?.type as LeaseTermType) ?? 'fixed_term',
			startDate: leaseData.startDate,
			...(leaseData.endDate ? { endDate: leaseData.endDate } : {}),
			rentAmount: leaseData.rentAmount,
			currency: 'USD',
			dueDate: structuredTerms?.leaseTerms?.dueDate ?? 1,
			lateFee: structuredTerms?.leaseTerms?.lateFee ?? { enabled: false },
			securityDeposit: {
				amount: leaseData.securityDeposit || 0,
				monthsRent: structuredTerms?.leaseTerms?.securityDeposit?.monthsRent ?? 1
			}
		}

		const leaseFormData: LeaseFormData = {
			property,
			owner,
			tenants,
			leaseTerms,
			options: structuredTerms?.options ?? {
				includeStateDisclosures: true,
				includeFederalDisclosures: true,
				includeSignaturePages: true,
				format: 'standard'
			}
		}

		return leaseFormData
	}
}
