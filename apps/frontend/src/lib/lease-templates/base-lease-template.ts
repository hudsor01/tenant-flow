/**
 * Base lease template that can be customized for different states
 * This serves as the foundation for all state-specific lease agreements
 */

// Base lease template utilities and types

import type {
	LeaseFormData as LeaseTemplateData,
	StateLeaseRequirements
} from '@repo/shared'
import { formatLeaseDate } from '@/lib/utils/date-formatting'

export function generateBaseLease(
	data: LeaseTemplateData,
	stateRequirements: StateLeaseRequirements
): string {
	const currentDate = new Date().toLocaleDateString()
	// Handle both string[] and {name: string}[] formats for tenant names
	const tenantList =
		data.tenantNames
			?.map((t: string | { name: string }) =>
				typeof t === 'string' ? t : t.name
			)
			.join(', ') || 'Tenant'
	const utilitiesList =
		data.utilitiesIncluded?.length > 0
			? data.utilitiesIncluded.join(', ')
			: 'None included'

	return `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on ${currentDate}, between ${data.landlordName} ("Landlord") and ${tenantList} ("Tenant(s)") for the property located at:

${data.propertyAddress}${data.unitNumber ? `, Unit ${data.unitNumber}` : ''}
${data.city}, ${data.state} ${data.zipCode}

TERMS AND CONDITIONS:

1. LEASE TERM
The lease term begins on ${formatLeaseDate(data.leaseStartDate)} and ends on ${formatLeaseDate(data.leaseEndDate)}.

2. RENT
Monthly rent is $${data.rentAmount.toLocaleString()}, due on the ${data.paymentDueDate}${data.paymentDueDate === 1 ? 'st' : data.paymentDueDate === 2 ? 'nd' : data.paymentDueDate === 3 ? 'rd' : 'th'} of each month.

Payment Method: ${data.paymentMethod.replace('_', ' ').toUpperCase()}
${data.paymentAddress ? `Payment Address: ${data.paymentAddress}` : ''}

3. SECURITY DEPOSIT
Security deposit: $${data.securityDeposit.toLocaleString()}
${stateRequirements.securityDepositLimit && stateRequirements.securityDepositLimit > 0 ? `\nState Limit: ${stateRequirements.securityDepositLimit}` : ''}

4. LATE FEES
Late fee of $${data.lateFeeAmount} applies after ${data.lateFeeDays} days past due date.

5. UTILITIES
The following utilities are included in rent: ${utilitiesList}

6. PET POLICY
${data.petPolicy === 'allowed' ? 'Pets are allowed.' : data.petPolicy === 'with_deposit' ? `Pets allowed with additional deposit of $${data.petDeposit ?? 0}.` : 'No pets allowed.'}

7. SMOKING POLICY
${data.smokingPolicy === 'allowed' ? 'Smoking is permitted.' : 'No smoking allowed on the premises.'}

8. MAINTENANCE RESPONSIBILITY
${data.maintenanceResponsibility === 'landlord' ? 'Landlord is responsible for major repairs and maintenance.' : data.maintenanceResponsibility === 'tenant' ? 'Tenant is responsible for all maintenance and repairs.' : 'Maintenance responsibilities are shared between landlord and tenant.'}

9. ENTRY NOTICE
Landlord must provide proper notice before entering the premises as required by state law.

10. LEASE TERMINATION
${stateRequirements.noticePeriods.terminationByTenant} days notice required by tenant for lease termination.
${stateRequirements.noticePeriods.terminationByLandlord} days notice required by landlord for lease termination.

${
	stateRequirements.mandatoryDisclosures &&
	stateRequirements.mandatoryDisclosures.length > 0
		? `
REQUIRED DISCLOSURES:
${stateRequirements.mandatoryDisclosures.map((disclosure: string) => `• ${disclosure}`).join('\n')}
`
		: ''
}

${
	stateRequirements.requiredClauses &&
	stateRequirements.requiredClauses.length > 0
		? `
STATE-SPECIFIC PROVISIONS:
${stateRequirements.requiredClauses.map((clause: string) => `• ${clause}`).join('\n')}
`
		: ''
}

${
	data.additionalTerms
		? `
ADDITIONAL TERMS:
${data.additionalTerms}
`
		: ''
}

LANDLORD CONTACT INFORMATION:
Name: ${data.landlordName}
Email: ${data.landlordEmail}
${data.landlordPhone ? `Phone: ${data.landlordPhone}` : ''}
Address: ${data.landlordAddress}

By signing below, both parties agree to the terms and conditions of this lease agreement.

Landlord Signature: _________________________ Date: _________
${data.landlordName}

${data.tenantNames
	.map(
		(tenant: string | { name: string }) => `
Tenant Signature: _________________________ Date: _________
${typeof tenant === 'string' ? tenant : tenant.name}
`
	)
	.join('')}

This lease agreement was generated on ${formatLeaseDate(new Date().toISOString())} and complies with ${data.state} state laws and regulations.
`
}

// Re-export types for sibling modules
export type {
	LeaseFormData as LeaseTemplateData,
	StateLeaseRequirements
} from '@repo/shared'
