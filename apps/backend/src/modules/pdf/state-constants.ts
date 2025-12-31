/**
 * State Constants for Lease PDF Templates
 *
 * Defines supported states and default values for lease PDF generation.
 * Centralizes state-related configuration to enable easy expansion.
 */

/**
 * Default state code when none is specified
 */
export const DEFAULT_STATE_CODE = 'TX' as const

/**
 * Default state name for template file naming
 */
export const DEFAULT_STATE_NAME = 'Texas' as const

/**
 * Supported state codes and their corresponding template names
 * Only states with existing templates should be listed here
 */
export const SUPPORTED_STATES = {
	TX: 'Texas'
	// Add more states as templates become available:
	// CA: 'California',
	// NY: 'New_York',
	// FL: 'Florida',
} as const satisfies Record<string, string>

/**
 * All US state codes for validation purposes
 * This is the complete list of valid 2-letter US state codes
 */
export const US_STATE_CODES = [
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
	'DC',
	'PR',
	'VI',
	'GU',
	'AS',
	'MP'
] as const

/**
 * Type for valid US state codes
 */
export type StateCode = (typeof US_STATE_CODES)[number]

/**
 * Type for supported states (states with templates)
 */
export type SupportedStateCode = keyof typeof SUPPORTED_STATES

/**
 * Template types for future extensibility
 */
export const TEMPLATE_TYPES = {
	RESIDENTIAL: 'residential',
	COMMERCIAL: 'commercial'
	// Add more template types as needed
} as const

/**
 * Type for template types
 */
export type TemplateType = keyof typeof TEMPLATE_TYPES

/**
 * Default template type
 */
export const DEFAULT_TEMPLATE_TYPE: TemplateType = 'RESIDENTIAL'

/**
 * Template file naming pattern
 * {StateName}_{TemplateType}_Lease_Agreement.pdf
 */
export const TEMPLATE_FILE_PATTERN =
	'{stateName}_{templateType}_Lease_Agreement.pdf'
