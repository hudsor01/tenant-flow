import { z } from 'zod'

// Comprehensive lease form validation schema
export const leaseFormSchema = z.object({
	// Property Information
	propertyAddress: z.string().min(1, 'Property address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(2, 'State is required'),
	zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP code is required'),
	unitNumber: z.string().optional(),

	// Landlord Information
	landlordName: z.string().min(1, 'Landlord name is required'),
	landlordEmail: z.string().email('Valid email is required'),
	landlordPhone: z.string().optional(),
	landlordAddress: z.string().min(1, 'Landlord address is required'),

	// Tenant Information
	tenantNames: z
		.array(z.object({ name: z.string().min(1, 'Tenant name is required') }))
		.min(1, 'At least one tenant is required'),

	// Lease Terms
	rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
	securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
	leaseStartDate: z.string().min(1, 'Lease start date is required'),
	leaseEndDate: z.string().min(1, 'Lease end date is required'),

	// Payment Information
	paymentDueDate: z.number().min(1).max(31),
	lateFeeAmount: z.number().min(0),
	lateFeeDays: z.number().min(1),
	paymentMethod: z.enum(['check', 'online', 'bank_transfer', 'cash']),
	paymentAddress: z.string().optional(),

	// Additional Terms
	petPolicy: z.enum(['allowed', 'not_allowed', 'with_deposit']),
	petDeposit: z.number().optional(),
	smokingPolicy: z.enum(['allowed', 'not_allowed']),
	maintenanceResponsibility: z.enum(['landlord', 'tenant', 'shared']),
	utilitiesIncluded: z.array(z.string()),
	additionalTerms: z.string().optional()
})

export type LeaseFormData = z.infer<typeof leaseFormSchema>

// Available utilities options
export const UTILITIES_OPTIONS = [
	'Water',
	'Electricity', 
	'Gas',
	'Internet',
	'Cable/TV',
	'Trash/Recycling',
	'Sewer',
	'Heating',
	'Air Conditioning',
	'Lawn Care',
	'Snow Removal'
] as const

// Payment method options with labels
export const PAYMENT_METHODS = [
	{ value: 'check', label: 'Check' },
	{ value: 'online', label: 'Online Payment' },
	{ value: 'bank_transfer', label: 'Bank Transfer' },
	{ value: 'cash', label: 'Cash' }
] as const

// Policy options
export const PET_POLICIES = [
	{ value: 'not_allowed', label: 'No Pets Allowed' },
	{ value: 'allowed', label: 'Pets Allowed' },
	{ value: 'with_deposit', label: 'Pets Allowed with Deposit' }
] as const

export const SMOKING_POLICIES = [
	{ value: 'not_allowed', label: 'No Smoking' },
	{ value: 'allowed', label: 'Smoking Allowed' }
] as const

export const MAINTENANCE_RESPONSIBILITIES = [
	{ value: 'landlord', label: 'Landlord Responsible' },
	{ value: 'tenant', label: 'Tenant Responsible' },
	{ value: 'shared', label: 'Shared Responsibility' }
] as const