import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
	InternalServerErrorException
} from '@nestjs/common'
import type {
	LeaseFormData,
	LeaseTermType,
	USState
} from '@repo/shared/types/lease-generator.types'
import { LeasesService } from './leases.service'

const SAFE_LEASE_COLUMNS = `
	id,
	propertyId,
	unitId,
	tenantId,
	rentAmount,
	securityDeposit,
	startDate,
	endDate,
	monthlyRent,
	status,
	terms,
	gracePeriodDays,
	lateFeeAmount,
	lateFeePercentage,
	stripeSubscriptionId,
	stripe_subscription_id,
	lease_document_url,
	signature,
	signed_at,
	version,
	createdAt,
	updatedAt
`.trim()

const SAFE_UNIT_COLUMNS = `
	id,
	propertyId,
	unitNumber,
	bedrooms,
	bathrooms,
	squareFeet,
	rent,
	status,
	lastInspectionDate,
	version,
	createdAt,
	updatedAt
`.trim()

/**
 * Lease Transformation Service
 * Handles transformation of database lease records to LeaseFormData structure
 * Extracted from LeaseGeneratorController for better separation of concerns
 */
@Injectable()
export class LeaseTransformationService {
	private readonly logger = new Logger(LeaseTransformationService.name)

	constructor(private readonly leasesService: LeasesService) {}

	/**
	 * Build LeaseFormData either from full relational data or fallback JSON terms.
	 */
	async buildLeaseFormData(
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
					.select(SAFE_LEASE_COLUMNS)
					.eq('id', leaseId)
					.single()

				if (basicError || !basicLease) {
					// Check if it's a not found error (PGRST116 is PostgREST not found code)
					if (basicError?.code === 'PGRST116' || !basicLease) {
						this.logger.warn('Lease not found', { leaseId })
						throw new NotFoundException(`Lease not found: ${leaseId}`)
					}

					this.logger.error('Failed to fetch basic lease data', {
						leaseId,
						error: basicError
							? (basicError as { message?: string }).message
							: 'Unknown error'
					})
					throw new BadRequestException('Failed to fetch lease data')
				}

				return this.transformLeaseToFormData(basicLease)
			} catch (fallbackError) {
				// Re-throw NotFoundException
				if (fallbackError instanceof NotFoundException) {
					throw fallbackError
				}

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
				${SAFE_LEASE_COLUMNS},
				unit:unit_id (
					${SAFE_UNIT_COLUMNS},
					property:property_id (
						id,
						name,
						address,
						city,
						state,
						zipCode,
						propertyType,
						owner:user_id (
							id,
							email,
							name,
							phone
						)
					)
				),
				tenant:tenant_id (
					id,
					name,
					email,
					phone
				)
			`
			)
			.eq('id', leaseId)
			.single()

		if (error || !data) {
			// Check if it's a not found error (PGRST116 is PostgREST not found code)
			if (error?.code === 'PGRST116' || !data) {
				this.logger.warn('Lease not found in fetchLeaseWithRelations', {
					leaseId
				})
				throw new NotFoundException(`Lease not found: ${leaseId}`)
			}

			this.logger.error('Failed to fetch lease with relations', {
				leaseId,
				error: error ? (error as { message?: string }).message : 'Unknown error'
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
