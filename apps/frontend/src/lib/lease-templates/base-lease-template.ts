/**
 * Base lease template generator
 * Uses native template literals and simple data transformation
 */

import type { LeaseGeneratorForm, StateLeaseRequirements } from '@repo/shared'

// Native date formatter
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Native ordinal suffix
const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function generateBaseLease(
  data: LeaseGeneratorForm,
  stateRequirements: StateLeaseRequirements
): string {
  // Simple destructuring with defaults - using actual field names from schema
  const {
    landlordName = 'Landlord',
    tenantNames = [],
    propertyAddress = '',
    unitNumber = '',
    city = '',
    state = '',
    zipCode = '',
    leaseStartDate,
    leaseEndDate,
    rentAmount = 0,
    paymentDueDate = 1,
    paymentMethod = 'check',
    paymentAddress = '',
    securityDeposit = 0,
    utilitiesIncluded = [],
    petPolicy = 'not_allowed',
    petDeposit = 0,
    maintenanceResponsibility = 'landlord',  // Note: different field name
    lateFeeAmount = 0,  // Note: different field name
    lateFeeDays = 5,    // Note: different field name
    additionalTerms = '',
    specialProvisions = ''
  } = data

  // Native array methods for tenant names
  const tenants = tenantNames.map(t => t.name).join(', ') || 'Tenant'
  const utilities = utilitiesIncluded.join(', ') || 'None included'
  const address = unitNumber ? `${propertyAddress}, Unit ${unitNumber}` : propertyAddress
  
  // Native template literal for the lease
  return `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on ${formatDate(new Date())}, between ${landlordName} ("Landlord") and ${tenants} ("Tenant(s)") for the property located at:

${address}
${city}, ${state} ${zipCode}

TERMS AND CONDITIONS:

1. LEASE TERM
The lease term begins on ${formatDate(leaseStartDate)} and ends on ${formatDate(leaseEndDate)}.

2. RENT
Monthly rent is $${rentAmount.toLocaleString()}, due on the ${getOrdinal(paymentDueDate)} of each month.
Payment Method: ${paymentMethod.replace(/_/g, ' ').toUpperCase()}
${paymentAddress ? `Payment Address: ${paymentAddress}` : ''}

3. SECURITY DEPOSIT
Security deposit: $${securityDeposit.toLocaleString()}
${stateRequirements.securityDepositLimit ? `State Limit: ${stateRequirements.securityDepositLimit} months' rent` : ''}
${stateRequirements.securityDepositReturnPeriod ? `Return Period: Within ${stateRequirements.securityDepositReturnPeriod} days` : ''}

4. UTILITIES
Included utilities: ${utilities}

5. PET POLICY
${petPolicy}
${petDeposit > 0 ? `Pet deposit: $${petDeposit.toLocaleString()}` : ''}

6. MAINTENANCE
Maintenance responsibilities: ${maintenanceResponsibility.replace(/_/g, ' ')}

7. LATE FEES
Late fee: $${lateFeeAmount} after ${lateFeeDays} day grace period

8. ADDITIONAL TERMS
${additionalTerms || 'No additional terms specified'}

${specialProvisions ? `9. SPECIAL PROVISIONS\n${specialProvisions}\n` : ''}

${stateRequirements.mandatoryDisclosures?.length ? `REQUIRED STATE DISCLOSURES:\n${stateRequirements.mandatoryDisclosures.join('\n')}\n` : ''}

SIGNATURES:

_________________________    Date: __________
Landlord: ${landlordName}

${tenantNames.map((t, i) => `_________________________    Date: __________
Tenant ${i + 1}: ${t.name}`).join('\n\n')}

${stateRequirements.witnessRequired ? `
WITNESSES:

_________________________    Date: __________
Witness 1

_________________________    Date: __________  
Witness 2` : ''}

${stateRequirements.notarizationRequired ? `
NOTARY ACKNOWLEDGMENT:

State of ${state}
County of _____________

Subscribed and sworn before me this _____ day of _________, 20___

_________________________
Notary Public
My commission expires: __________` : ''}`
}

// Export a simplified validation function using native features
export function validateLeaseData(data: Partial<LeaseGeneratorForm>): string[] {
  const errors: string[] = []
  
  // Native validation checks
  if (!data.landlordName?.trim()) errors.push('Landlord name is required')
  if (!data.tenantNames?.length) errors.push('At least one tenant is required')
  if (!data.propertyAddress?.trim()) errors.push('Property address is required')
  if (!data.rentAmount || data.rentAmount <= 0) errors.push('Valid rent amount is required')
  if (!data.leaseStartDate) errors.push('Lease start date is required')
  if (!data.leaseEndDate) errors.push('Lease end date is required')
  
  // Native date validation
  if (data.leaseStartDate && data.leaseEndDate) {
    const start = new Date(data.leaseStartDate)
    const end = new Date(data.leaseEndDate)
    if (end <= start) errors.push('Lease end date must be after start date')
  }
  
  return errors
}