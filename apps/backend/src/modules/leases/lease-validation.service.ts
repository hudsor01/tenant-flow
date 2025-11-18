import { Injectable, BadRequestException } from '@nestjs/common'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'

/**
 * Lease Validation Service
 * Handles state-specific validation and business rule enforcement
 * Extracted from LeaseGeneratorController for better separation of concerns
 */
@Injectable()
export class LeaseValidationService {

	/**
	 * Validate required lease fields
	 */
	validateRequiredFields(leaseData: LeaseFormData): void {
		if (!leaseData?.property?.address?.state) {
			throw new BadRequestException('Property state is required')
		}
		if (!leaseData?.owner?.name) {
			throw new BadRequestException('Owner name is required')
		}
		if (!leaseData?.tenants?.length) {
			throw new BadRequestException('At least one tenant is required')
		}
		if (!leaseData?.leaseTerms?.rent_amount) {
			throw new BadRequestException('Rent amount is required')
		}
	}

	/**
	 * Validate and parse lease dates
	 */
	validateDates(leaseData: LeaseFormData): {
		start_date: Date
		end_date: Date
	} {
		const start_date = new Date(leaseData.leaseTerms.start_date)

		// end_date is required by schema, but leases can be month-to-month
		// For month-to-month leases, use a far-future date (100 years from start)
		const end_date = leaseData.leaseTerms.end_date
			? new Date(leaseData.leaseTerms.end_date)
			: new Date(start_date.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)

		if (isNaN(start_date.getTime())) {
			throw new BadRequestException('Invalid start date')
		}
		if (isNaN(end_date.getTime())) {
			throw new BadRequestException('Invalid end date')
		}

		return { start_date, end_date }
	}

	/**
	 * Validate lease data against state requirements
	 */
	validateLeaseData(leaseData: LeaseFormData): {
		valid: boolean
		errors: Array<{ field: string; message: string; code: string }>
		warnings: Array<{
			field: string
			message: string
			suggestion: string
		}>
		stateRequirements: {
			stateName: string
			security_depositMax: string
			lateFeeGracePeriod: string
			requiredDisclosures: string[]
		}
	} {
		const errors: Array<{ field: string; message: string; code: string }> = []
		const warnings: Array<{
			field: string
			message: string
			suggestion: string
		}> = []

		// Basic validation
		if (!leaseData?.property?.address?.state) {
			errors.push({
				field: 'property.address_line1.state',
				message: 'Property state is required',
				code: 'REQUIRED_FIELD'
			})
		}

		// State-specific validation (simplified)
		if (leaseData?.property?.address?.state === 'CA') {
			// California security deposit limit: 2x monthly rent
			const rent_amount = leaseData?.leaseTerms?.rent_amount || 0
			const depositAmount =
				leaseData?.leaseTerms?.security_deposit?.amount || 0

			if (depositAmount > rent_amount * 2) {
				errors.push({
					field: 'leaseTerms.security_deposit.amount',
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
	}

	/**
	 * Get simplified state requirements
	 */
	getStateRequirements(state: string): {
		stateName: string
		security_depositMax: string
		lateFeeGracePeriod: string
		requiredDisclosures: string[]
	} {
		const requirements: Record<
			string,
			{
				stateName: string
				security_depositMax: string
				lateFeeGracePeriod: string
				requiredDisclosures: string[]
			}
		> = {
			CA: {
				stateName: 'California',
				security_depositMax: '2x monthly rent',
				lateFeeGracePeriod: '3 days minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)', 'Bed Bug History']
			},
			TX: {
				stateName: 'Texas',
				security_depositMax: '2x monthly rent',
				lateFeeGracePeriod: '1 day minimum',
				requiredDisclosures: ['Lead Paint (pre-1978)']
			},
			NY: {
				stateName: 'New York',
				security_depositMax: '1x monthly rent',
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
			security_depositMax: 'Varies by state',
			lateFeeGracePeriod: 'Check state law',
			requiredDisclosures: ['Lead Paint (pre-1978)']
		}
	}
}
