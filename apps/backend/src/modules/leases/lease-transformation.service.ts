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
import { PROPERTY_TYPES } from '@repo/shared/constants/status-types'
import { LeasesService } from './leases.service'

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
		lease_id: string
	): Promise<LeaseFormData> {
		try {
			// Try to fetch lease with all relations first
			const leaseWithRelations = await this.fetchLeaseWithRelations(
				token,
				lease_id
			)
			return this.transformLeaseWithRelationsToFormData(leaseWithRelations)
		} catch (error) {
			this.logger.warn(
				'Failed to fetch lease with relations, falling back to basic lease data',
				{
					lease_id,
					error: error instanceof Error ? error.message : String(error)
				}
			)

			// Fallback: fetch basic lease and use transformLeaseToFormData
			try {
				const client = this.leasesService.getUserClient(token)
				const { data: basicLease, error: basicError } = await client
					.from('leases')
					.select('*')
					.eq('id', lease_id)
					.single()

				if (basicError || !basicLease) {
					// Check if it's a not found error (PGRST116 is PostgREST not found code)
					if (basicError?.code === 'PGRST116' || !basicLease) {
						this.logger.warn('Lease not found', { lease_id })
						throw new NotFoundException(`Lease not found: ${lease_id}`)
					}

					this.logger.error('Failed to fetch basic lease data', {
						lease_id,
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
						lease_id,
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
	private async fetchLeaseWithRelations(token: string, lease_id: string) {
		const client = this.leasesService.getUserClient(token)

		// Fetch lease with related data in a single query
		const { data, error } = await client
			.from('leases')
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
				tenant:primary_tenant_id (
					*
				)
			`
			)
			.eq('id', lease_id)
			.single()

		if (error || !data) {
			// Check if it's a not found error (PGRST116 is PostgREST not found code)
			if (error?.code === 'PGRST116' || !data) {
				this.logger.warn('Lease not found in fetchLeaseWithRelations', {
					lease_id
				})
				throw new NotFoundException(`Lease not found: ${lease_id}`)
			}

			this.logger.error('Failed to fetch lease with relations', {
				lease_id,
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
			start_date: string
			end_date: string
			rent_amount: number
			security_deposit: number
			status: string
			terms: string | null
			unit: {
				id: string
				unit_number: string
				bedrooms: number
				bathrooms: number
				square_feet: number | null
				property: {
					id: string
					name: string
					address_line1: string
					address_line2: string | null
					city: string
					state: string
					postal_code: string
					property_type: string
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

		// Map possible property type strings to canonical PropertyType values
		const propertyTypeMap: Record<string, LeaseFormData['property']['type']> = {
			SINGLE_FAMILY: PROPERTY_TYPES.SINGLE_FAMILY,
			single_family: PROPERTY_TYPES.SINGLE_FAMILY,
			single_family_home: PROPERTY_TYPES.SINGLE_FAMILY,
			APARTMENT: PROPERTY_TYPES.APARTMENT,
			apartment: PROPERTY_TYPES.APARTMENT,
			CONDO: PROPERTY_TYPES.CONDO,
			condo: PROPERTY_TYPES.CONDO,
			TOWNHOUSE: PROPERTY_TYPES.TOWNHOUSE,
			townhouse: PROPERTY_TYPES.TOWNHOUSE,
			DUPLEX: PROPERTY_TYPES.MULTI_UNIT,
			duplex: PROPERTY_TYPES.MULTI_UNIT,
			MULTI_UNIT: PROPERTY_TYPES.MULTI_UNIT,
			multi_unit: PROPERTY_TYPES.MULTI_UNIT,
			COMMERCIAL: PROPERTY_TYPES.COMMERCIAL,
			commercial: PROPERTY_TYPES.COMMERCIAL,
			OTHER: PROPERTY_TYPES.OTHER,
			other: PROPERTY_TYPES.OTHER
		}

		const property = lease.unit.property
		const owner = property.owner
		const tenant = lease.tenant
		const unit = lease.unit

		// Build property address object with proper optional handling
		const propertyAddress: LeaseFormData['property']['address'] = {
		street: property.address_line1,
		city: property.city,
		state: property.state as USState,
		postal_code: property.postal_code,
		...(unit.unit_number ? { unit: unit.unit_number } : {})
	}

		// Build property object with proper optional handling
		const propertyData: LeaseFormData['property'] = {
			address: propertyAddress,
			type:
				propertyTypeMap[property.property_type] ?? PROPERTY_TYPES.APARTMENT,
			bedrooms: unit.bedrooms || 1,
			bathrooms: unit.bathrooms || 1,
			parking: {
				included: false
			},
			amenities: []
		}

		// Add optional square_feet if present
		if (unit.square_feet) {
			propertyData.square_feet = unit.square_feet
		}

		// Build owner object with proper optional handling
		const ownerData: LeaseFormData['owner'] = {
			name: owner.name || owner.email,
			isEntity: false,
			address: {
				street: property.address_line1,
				city: property.city,
				state: property.state as USState,
				postal_code: property.postal_code
			},
			phone: owner.phone || '',
			email: owner.email
		}

		// Build lease terms with proper optional handling
		const leaseTermsData: LeaseFormData['leaseTerms'] = {
			type: 'fixed_term' as LeaseTermType,
			start_date: lease.start_date,
			rent_amount: lease.rent_amount,
			currency: 'USD',
			dueDate: 1,
			lateFee: {
				enabled: false
			},
			security_deposit: {
				amount: lease.security_deposit || 0,
				monthsRent: 1
			}
		}

		// Add optional end_date if present
		if (lease.end_date) {
			leaseTermsData.end_date = lease.end_date
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
			start_date: string
			end_date: string
			rent_amount: number
			security_deposit: number
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
					? { unit: structuredTerms?.property?.address?.unit }
					: {}),
				city: structuredTerms?.property?.address?.city ?? 'Unknown City',
				state:
					(structuredTerms?.property?.address?.state as USState) ??
					fallbackPropertyState,
				postal_code: structuredTerms?.property?.address?.postal_code ?? '00000'
			},
			type: (structuredTerms?.property?.type ?? 'APARTMENT') as LeaseFormData['property']['type'],
			bedrooms: structuredTerms?.property?.bedrooms ?? 1,
			bathrooms: structuredTerms?.property?.bathrooms ?? 1,
			...(structuredTerms?.property?.square_feet
				? { square_feet: structuredTerms.property.square_feet }
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
				postal_code:
					structuredTerms?.owner?.address?.postal_code ?? property.address.postal_code
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
			start_date: leaseData.start_date,
			...(leaseData.end_date ? { end_date: leaseData.end_date } : {}),
			rent_amount: leaseData.rent_amount,
			currency: 'USD',
			dueDate: structuredTerms?.leaseTerms?.dueDate ?? 1,
			lateFee: structuredTerms?.leaseTerms?.lateFee ?? { enabled: false },
			security_deposit: {
				amount: leaseData.security_deposit || 0,
				monthsRent: structuredTerms?.leaseTerms?.security_deposit?.monthsRent ?? 1
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
