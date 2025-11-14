import type { Json } from './supabase-generated.js'

/**
 * Enumerates Stripe Identity verification session states we care about.
 * We allow unknown strings to keep the compiler happy if Stripe adds more
 * states in the future.
 */
export type IdentityVerificationStatus =
	| 'created'
	| 'processing'
	| 'requires_input'
	| 'verified'
	| 'canceled'
	| 'expired'
	| 'redacted'
	| (string & {})

/**
 * Represents the identity verification status we store on the user.
 * This type is shared between backend controllers and frontend queries.
 */
export interface IdentityVerificationRecord {
	sessionId: string | null
	status: IdentityVerificationStatus | null
	verifiedAt: string | null
	lastError: string | null
	data: Json | null
}

/**
 * Payload returned when creating or resuming a verification session.
 */
export interface IdentityVerificationSessionPayload {
	sessionId: string
	clientSecret: string
	status: IdentityVerificationStatus
}
