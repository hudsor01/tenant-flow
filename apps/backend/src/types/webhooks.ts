/**
 * Webhook Type Definitions
 */

/**
 * Supabase Auth Webhook Payload
 * Sent when user confirms email in Supabase Auth
 */
export interface SupabaseAuthWebhookPayload {
	type: string
	record: {
		id: string
		email: string
		confirmed_at?: string | null
		email_confirmed_at?: string | null
		raw_user_meta_data?: {
			tenant_id?: string
		} | null
	}
}
