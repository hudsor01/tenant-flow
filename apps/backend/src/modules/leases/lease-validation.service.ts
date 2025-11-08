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
		if (!leaseData?.leaseTerms?.rentAmount) {
			throw new BadRequestException('Rent amount is required')
		}
	}

	/**
	 * Validate and parse lease dates
	 */
	validateDates(leaseData: LeaseFormData): {
		startDate: Date
		endDate: Date
	} {
		const startDate = new Date(leaseData.leaseTerms.startDate)

		// endDate is required by schema, but leases can be month-to-month
		// For month-to-month leases, use a far-future date (100 years from start)
		const endDate = leaseData.leaseTerms.endDate
			? new Date(leaseData.leaseTerms.endDate)
			: new Date(startDate.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)

		if (isNaN(startDate.getTime())) {
			throw new BadRequestException('Invalid start date')
		}
		if (isNaN(endDate.getTime())) {
			throw new BadRequestException('Invalid end date')
		}

		return { startDate, endDate }
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
			securityDepositMax: string
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
	}

	/**
	 * Get simplified state requirements
	 */
	getStateRequirements(state: string): {
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
