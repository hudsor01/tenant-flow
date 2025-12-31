/**
 * Lease PDF Field Mapper
 *
 * Maps database lease data to residential lease PDF fields.
 * Auto-fills all available data, identifies missing required fields.
 *
 * CRITICAL: Only asks user for data we don't have in the database.
 * Currently configured for Texas residential leases.
 */

import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { AppLogger } from '../../logger/app-logger.service'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']

export interface LeaseData {
	// Lease record with relations
	lease: LeaseRow
	property: PropertyRow
	unit: UnitRow
	landlord: UserRow
	tenant: UserRow
	tenantRecord: TenantRow
}

export interface LeasePdfFields {
	// Auto-filled from database
	agreement_date_day: string
	agreement_date_month: string
	agreement_date_year: string
	landlord_name: string
	tenant_name: string
	property_address: string
	lease_start_date: string
	lease_end_date: string
	monthly_rent_amount: string
	security_deposit_amount: string
	late_fee_per_day: string
	nsf_fee: string
	month_to_month_rent: string
	pet_fee_per_day: string
	property_built_before_1978: string

	// User must provide (missing from DB) - must be undefined when missing
	immediate_family_members?: string | undefined
	landlord_notice_address?: string | undefined
}

export interface MissingFieldsInfo {
	fields: string[]
	isComplete: boolean
}

@Injectable()
export class LeasePdfMapperService {
	constructor(private readonly logger: AppLogger) {}

	/**
	 * Map database data to PDF fields
	 * Returns filled fields + list of missing required fields
	 */
	mapLeaseToPdfFields(data: LeaseData): {
		fields: LeasePdfFields
		missing: MissingFieldsInfo
	} {
		const today = new Date()

		// Auto-fill everything we have
		const fields: LeasePdfFields = {
			// Agreement date (today's date)
			agreement_date_day: today.getDate().toString(),
			agreement_date_month: today.toLocaleDateString('en-US', {
				month: 'long'
			}),
			agreement_date_year: today.getFullYear().toString().slice(-2), // Last 2 digits

			// Parties
			landlord_name: this.formatLandlordName(data.landlord),
			tenant_name: this.formatTenantName(data.tenant),

			// Property
			property_address: this.formatPropertyAddress(data.property, data.unit),

			// Term
			lease_start_date: this.formatDate(data.lease.start_date),
			lease_end_date: this.formatDate(data.lease.end_date),

			// Financial
			monthly_rent_amount: this.formatCurrency(data.lease.rent_amount),
			security_deposit_amount: this.formatCurrency(data.lease.security_deposit),
			late_fee_per_day: this.formatCurrency(data.lease.late_fee_amount ?? 5000), // Default $50/day
			nsf_fee: this.formatCurrency(3500), // Texas standard $35
			month_to_month_rent: this.formatCurrency(
				Math.floor(data.lease.rent_amount * 1.1) // 10% increase for month-to-month
			),
			pet_fee_per_day: this.formatCurrency(2500), // Default $25/day

			// Disclosures
			property_built_before_1978: data.lease.property_built_before_1978
				? 'Yes'
				: 'No',

			// Missing fields (user must provide)
			immediate_family_members: undefined,
			landlord_notice_address: undefined
		}

		// Identify missing required fields
		const missingFields: string[] = []
		if (!fields.immediate_family_members) {
			missingFields.push('immediate_family_members')
		}
		if (!fields.landlord_notice_address) {
			missingFields.push('landlord_notice_address')
		}

		this.logger.log('Mapped lease data to PDF fields', {
			leaseId: data.lease.id,
			autoFilledFields: Object.keys(fields).filter(
				k => fields[k as keyof LeasePdfFields] !== undefined
			).length,
			missingFields: missingFields.length
		})

		return {
			fields,
			missing: {
				fields: missingFields,
				isComplete: missingFields.length === 0
			}
		}
	}

	/**
	 * Format landlord name from user record
	 */
	private formatLandlordName(user: UserRow): string {
		if (user.first_name && user.last_name) {
			return `${user.first_name} ${user.last_name}`
		}
		return user.full_name || user.email
	}

	/**
	 * Format tenant name from user record
	 */
	private formatTenantName(user: UserRow): string {
		if (user.first_name && user.last_name) {
			return `${user.first_name} ${user.last_name}`
		}
		return user.full_name || user.email
	}

	/**
	 * Format property address
	 */
	private formatPropertyAddress(property: PropertyRow, unit: UnitRow): string {
		const parts: string[] = []

		// Unit number (if exists)
		if (unit.unit_number) {
			parts.push(`Unit ${unit.unit_number}`)
		}

		// Street address
		parts.push(property.address_line1)

		if (property.address_line2) {
			parts.push(property.address_line2)
		}

		// City, State ZIP
		parts.push(`${property.city}, ${property.state} ${property.postal_code}`)

		return parts.join(', ')
	}

	/**
	 * Format date as "Month DD, YYYY"
	 */
	private formatDate(dateString: string): string {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	/**
	 * Format currency from cents to dollars
	 */
	private formatCurrency(cents: number): string {
		const dollars = cents / 100
		return dollars.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})
	}

	/**
	 * Validate user-provided missing fields
	 */
	validateMissingFields(data: { [key: string]: string }): {
		isValid: boolean
		errors: string[]
	} {
		const errors: string[] = []

		// Immediate family members (can be empty string for "none")
		if (data.immediate_family_members === undefined) {
			errors.push('immediate_family_members is required')
		}

		// Landlord notice address (required)
		if (
			!data.landlord_notice_address ||
			data.landlord_notice_address.trim() === ''
		) {
			errors.push('landlord_notice_address is required and cannot be empty')
		}

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Merge user-provided fields with auto-filled fields
	 */
	mergeMissingFields(
		autoFilled: LeasePdfFields,
		userProvided: Partial<
			Pick<
				LeasePdfFields,
				'immediate_family_members' | 'landlord_notice_address'
			>
		>
	): LeasePdfFields {
		return {
			...autoFilled,
			immediate_family_members: userProvided.immediate_family_members || 'None',
			landlord_notice_address: userProvided.landlord_notice_address || undefined
		}
	}
}
