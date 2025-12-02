import { Injectable, BadRequestException } from '@nestjs/common'
import type { LeaseFormData } from '@repo/shared/types/lease-generator.types'

/**
 * Lease Validation Service
 *
 * Handles Texas-specific validation and business rule enforcement.
 * Currently focused on Texas only - other states can be added later.
 *
 * Extracted from LeaseGeneratorController for better separation of concerns.
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
		if (!leaseData?.leaseTerms) {
			throw new BadRequestException('Lease terms are required')
		}
		if (!leaseData.leaseTerms.start_date) {
			throw new BadRequestException('Lease start date is required')
		}

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
	 * Validate lease data against Texas requirements
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
				field: 'property.address.state',
				message: 'Property state is required',
				code: 'REQUIRED_FIELD'
			})
		}

		const state = leaseData?.property?.address?.state

		// Currently only supporting Texas
		if (state && state !== 'TX') {
			errors.push({
				field: 'property.address.state',
				message: 'Only Texas (TX) properties are currently supported',
				code: 'UNSUPPORTED_STATE'
			})
		}

		// Texas-specific validation
		if (state === 'TX') {
			// Texas security deposit: no statutory limit, but 2x monthly rent is standard practice
			const rent_amount = leaseData?.leaseTerms?.rent_amount || 0
			const depositAmount = leaseData?.leaseTerms?.security_deposit?.amount || 0

			// Warning if deposit exceeds 2x rent (unusual but not illegal in TX)
			if (depositAmount > rent_amount * 2) {
				warnings.push({
					field: 'leaseTerms.security_deposit.amount',
					message:
						'Security deposit exceeds 2x monthly rent. While legal in Texas, this may deter tenants.',
					suggestion: 'Consider reducing to 1-2x monthly rent'
				})
			}

			// Texas late fee: must be reasonable (typically 5-10% of rent or flat fee)
			if (leaseData?.leaseTerms?.lateFee?.enabled) {
				const lateFeeAmount = leaseData.leaseTerms.lateFee.amount || 0
				const lateFeePercentage = leaseData.leaseTerms.lateFee.percentage

				// Check if late fee seems excessive (> 15% of rent)
				if (lateFeeAmount > rent_amount * 0.15 && !lateFeePercentage) {
					warnings.push({
						field: 'leaseTerms.lateFee.amount',
						message:
							'Late fee exceeds 15% of monthly rent. Texas requires late fees to be "reasonable."',
						suggestion: 'Consider reducing to 5-10% of monthly rent'
					})
				}

				// Texas requires at least 2-day grace period (Tex. Prop. Code § 92.019)
				const gracePeriod = leaseData.leaseTerms.lateFee.gracePeriod || 0
				if (gracePeriod < 2) {
					errors.push({
						field: 'leaseTerms.lateFee.gracePeriod',
						message:
							'Texas law requires minimum 2-day grace period before late fees (Tex. Prop. Code § 92.019)',
						code: 'TX_GRACE_PERIOD'
					})
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			stateRequirements: this.getTexasRequirements()
		}
	}

	/**
	 * Get Texas-specific lease requirements
	 */
	getTexasRequirements(): {
		stateName: string
		security_depositMax: string
		lateFeeGracePeriod: string
		requiredDisclosures: string[]
	} {
		return {
			stateName: 'Texas',
			security_depositMax: 'No statutory limit (2x monthly rent recommended)',
			lateFeeGracePeriod: '2 days minimum (Tex. Prop. Code § 92.019)',
			requiredDisclosures: [
				'Lead Paint Disclosure (pre-1978 buildings)',
				'Property Condition Report',
				'Landlord Contact Information'
			]
		}
	}

	/**
	 * Get state requirements - currently returns Texas only
	 * @deprecated Use getTexasRequirements() directly. Other states will be added later.
	 */
	getStateRequirements(_state: string): {
		stateName: string
		security_depositMax: string
		lateFeeGracePeriod: string
		requiredDisclosures: string[]
	} {
		// Always return Texas requirements for now
		return this.getTexasRequirements()
	}
}
