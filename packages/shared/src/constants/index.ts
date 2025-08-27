/**
 * Constants barrel exports
 * Centralized exports for all runtime constants
 */

// Invoice constants
export {
	LEAD_MAGNET_CONFIG,
	CUSTOMER_INVOICE_STATUS,
	CUSTOMER_INVOICE_STATUS_OPTIONS,
	INVOICE_DEFAULTS,
	INVOICE_NUMBER_PREFIX,
	INVOICE_FILE_LIMITS,
	type LeadMagnetTier
} from './invoices'

// Auth constants
export * from './auth'

// Billing constants
export * from './billing'

// Note: Enum constants removed - now using database-generated types from ../types/supabase-generated

// Reminder constants
export * from './reminders'
