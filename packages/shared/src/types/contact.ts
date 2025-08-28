/**
 * CONTACT TYPES - All contact form and communication interfaces
 * CONSOLIDATED from scattered contact definitions
 */

// =============================================================================
// CONTACT FORM TYPES - MIGRATED from inline definitions
// =============================================================================

export interface ContactFormRequest {
	name: string
	email: string
	subject: string
	message: string
	phone?: string
	company?: string
	urgency?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface ContactFormResponse {
	success: boolean
	message: string
	contactId?: string
}