/**
 * Validation schema for Lease missing fields
 *
 * Only validates fields that user MUST provide (not auto-filled from DB)
 * Currently configured for Texas residential leases
 */

import { z } from 'zod'

export const leaseMissingFieldsSchema = z.object({
	// Immediate family members (can be empty string for "None")
	immediate_family_members: z
		.string()
		.max(500, 'Family members list cannot exceed 500 characters')
		.default('None'),

	// Landlord notice address (required for legal notices)
	landlord_notice_address: z
		.string()
		.min(10, 'Landlord notice address is required')
		.max(500, 'Address cannot exceed 500 characters')
})

export type LeaseMissingFields = z.infer<typeof leaseMissingFieldsSchema>

// Form schema for frontend (string inputs that will be validated)
export const leaseMissingFieldsFormSchema = z.object({
	immediate_family_members: z.string().optional().default(''),
	landlord_notice_address: z.string().min(1, 'Landlord notice address is required')
})

export type LeaseMissingFieldsForm = z.infer<typeof leaseMissingFieldsFormSchema>
