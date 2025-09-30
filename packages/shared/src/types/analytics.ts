export type TenantFlowEvent =
	// Authentication Events
	| 'user_signed_up'
	| 'user_signed_in'
	| 'user_signed_out'
	| 'user_login_failed'
	| 'user_signup_failed'
	| 'user_oauth_failed'
	| 'user_oauth_initiated'
	| 'password_reset_requested'
	| 'password_reset_completed'
	| 'password_reset_failed'
	| 'password_updated'
	| 'profile_updated'

	// Property Management Events
	| 'property_created'
	| 'property_updated'
	| 'property_deleted'
	| 'property_viewed'

	// Unit Management Events
	| 'unit_created'
	| 'unit_updated'
	| 'unit_deleted'
	| 'unit_viewed'

	// Tenant Management Events
	| 'tenant_created'
	| 'tenant_updated'
	| 'tenant_deleted'
	| 'tenant_viewed'
	| 'tenant_invited'

	// Lease Management Events
	| 'lease_created'
	| 'lease_updated'
	| 'lease_renewed'
	| 'lease_terminated'
	| 'lease_viewed'
	| 'lease_document_uploaded'

	// Maintenance Events
	| 'maintenance_request_created'
	| 'maintenance_request_updated'
	| 'maintenance_request_completed'
	| 'maintenance_request_viewed'

	// Payment Events
	| 'payment_initiated'
	| 'payment_completed'
	| 'payment_failed'
	| 'subscription_upgraded'
	| 'subscription_downgraded'
	| 'subscription_cancelled'

	// Feature Usage Events
	| 'dashboard_viewed'
	| 'report_generated'
	| 'document_uploaded'
	| 'notification_sent'
	| 'settings_updated'

	// Form Events
	| 'form_viewed'
	| 'form_submitted'
	| 'form_validation_failed'
	| 'form_submission_failed'

	// Error Events
	| 'error_occurred'
	| 'api_error'
	| 'validation_error'

	// Security Events
	| 'security_rate_limit_triggered'
	| 'security_alert_distributed_attack'
	| 'security_alert_credential_stuffing'
	| 'security_rate_limit_stats'

export interface PropertyPerformanceData {
  name: string
  occupancy: number
  revenue: number
  units: number
  maintenance: number
}
