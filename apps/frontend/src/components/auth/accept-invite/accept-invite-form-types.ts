import { z } from 'zod'

/**
 * Form values for the accept invite signup form.
 */
export interface AcceptInviteFormValues {
	email: string
	password: string
	confirmPassword: string
}

/**
 * Validation schema for the accept invite signup form.
 * Defined here so invite-signup-form.tsx can own the form instance.
 */
export const signupSchema = z
	.object({
		email: z.string().email('Invalid email format'),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

/**
 * Invitation data returned from the backend when validating an invite code.
 */
export interface InvitationData {
	valid: boolean
	email: string
	expires_at: string
	property_owner_name?: string
	property_name?: string
	unit_number?: string
}

export type PageState =
	| 'loading'
	| 'valid'
	| 'invalid'
	| 'expired'
	| 'error'
	| 'accepted'
