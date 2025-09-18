/**
 * Handlebars Template Helpers for Lease Agreement
 * Production-ready formatting and utility functions
 */

import * as Handlebars from 'handlebars'
import type { LeaseFormData, StateLeaseRequirements } from '@repo/shared'

/**
 * Register all template helpers
 */
export function registerTemplateHelpers(): void {
	// Date formatting helper
	Handlebars.registerHelper('formatDate', (dateString: string) => {
		if (!dateString) return 'N/A'
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	})

	// Currency formatting helper
	Handlebars.registerHelper('formatCurrency', (cents: number) => {
		if (typeof cents !== 'number') return '$0.00'
		const dollars = cents / 100
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(dollars)
	})

	// Number formatting helper
	Handlebars.registerHelper('formatNumber', (num: number) => {
		if (typeof num !== 'number') return '0'
		return new Intl.NumberFormat('en-US').format(num)
	})

	// Ordinal number helper (1st, 2nd, 3rd, etc.)
	Handlebars.registerHelper('ordinal', (num: number) => {
		if (!num) return ''
		const s = ['th', 'st', 'nd', 'rd']
		const v = num % 100
		const suffix = s[(v - 20) % 10] || s[v] || s[0] || 'th'
		return num + suffix
	})

	// Join array helper
	Handlebars.registerHelper('join', (array: string[], separator: string) => {
		if (!Array.isArray(array)) return ''
		return array.join(separator || ', ')
	})

	// Property type formatter
	Handlebars.registerHelper('formatPropertyType', (type: string) => {
		const types: Record<string, string> = {
			single_family_home: 'Single Family Home',
			apartment: 'Apartment',
			condo: 'Condominium',
			townhouse: 'Townhouse',
			duplex: 'Duplex',
			mobile_home: 'Mobile Home',
			room_rental: 'Room Rental',
			commercial: 'Commercial Property'
		}
		return types[type] || type
	})

	// Lease type formatter
	Handlebars.registerHelper('formatLeaseType', (type: string) => {
		const types: Record<string, string> = {
			fixed_term: 'Fixed Term Lease',
			month_to_month: 'Month-to-Month',
			week_to_week: 'Week-to-Week',
			at_will: 'At-Will Tenancy'
		}
		return types[type] || type
	})

	// Fee type formatter
	Handlebars.registerHelper('formatFeeType', (type: string) => {
		const types: Record<string, string> = {
			pet_fee: 'Pet Fee',
			cleaning_fee: 'Cleaning Fee',
			application_fee: 'Application Fee',
			key_deposit: 'Key Deposit',
			other: 'Other Fee'
		}
		return types[type] || type
	})

	// Conditional equality helper
	Handlebars.registerHelper('eq', (a: string | number | boolean, b: string | number | boolean) => {
		return a === b
	})

	// Conditional inequality helper
	Handlebars.registerHelper('neq', (a: string | number | boolean, b: string | number | boolean) => {
		return a !== b
	})

	// Greater than helper
	Handlebars.registerHelper('gt', (a: number, b: number) => {
		return a > b
	})

	// Less than helper
	Handlebars.registerHelper('lt', (a: number, b: number) => {
		return a < b
	})

	// Logical AND helper
	Handlebars.registerHelper('and', (...args: unknown[]) => {
		// Remove the last argument (Handlebars options object)
		const values = args.slice(0, -1)
		return values.every(Boolean)
	})

	// Logical OR helper
	Handlebars.registerHelper('or', (...args: unknown[]) => {
		// Remove the last argument (Handlebars options object)
		const values = args.slice(0, -1)
		return values.some(Boolean)
	})

	// State name formatter
	Handlebars.registerHelper('stateName', (stateCode: string) => {
		const states: Record<string, string> = {
			AL: 'Alabama',
			AK: 'Alaska',
			AZ: 'Arizona',
			AR: 'Arkansas',
			CA: 'California',
			CO: 'Colorado',
			CT: 'Connecticut',
			DE: 'Delaware',
			FL: 'Florida',
			GA: 'Georgia',
			HI: 'Hawaii',
			ID: 'Idaho',
			IL: 'Illinois',
			IN: 'Indiana',
			IA: 'Iowa',
			KS: 'Kansas',
			KY: 'Kentucky',
			LA: 'Louisiana',
			ME: 'Maine',
			MD: 'Maryland',
			MA: 'Massachusetts',
			MI: 'Michigan',
			MN: 'Minnesota',
			MS: 'Mississippi',
			MO: 'Missouri',
			MT: 'Montana',
			NE: 'Nebraska',
			NV: 'Nevada',
			NH: 'New Hampshire',
			NJ: 'New Jersey',
			NM: 'New Mexico',
			NY: 'New York',
			NC: 'North Carolina',
			ND: 'North Dakota',
			OH: 'Ohio',
			OK: 'Oklahoma',
			OR: 'Oregon',
			PA: 'Pennsylvania',
			RI: 'Rhode Island',
			SC: 'South Carolina',
			SD: 'South Dakota',
			TN: 'Tennessee',
			TX: 'Texas',
			UT: 'Utah',
			VT: 'Vermont',
			VA: 'Virginia',
			WA: 'Washington',
			WV: 'West Virginia',
			WI: 'Wisconsin',
			WY: 'Wyoming',
			DC: 'District of Columbia'
		}
		return states[stateCode] || stateCode
	})

	// Pluralize helper
	Handlebars.registerHelper('pluralize', (count: number, singular: string, plural?: string) => {
		if (count === 1) return singular
		return plural || `${singular}s`
	})

	// Capitalize first letter
	Handlebars.registerHelper('capitalize', (str: string) => {
		if (!str) return ''
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
	})

	// Uppercase helper
	Handlebars.registerHelper('uppercase', (str: string) => {
		return str ? str.toUpperCase() : ''
	})

	// Lowercase helper
	Handlebars.registerHelper('lowercase', (str: string) => {
		return str ? str.toLowerCase() : ''
	})

	// Default value helper
	Handlebars.registerHelper('default', (value: string | number | null | undefined, defaultValue: string | number) => {
		return value || defaultValue
	})

	// Phone number formatter
	Handlebars.registerHelper('formatPhone', (phone: string) => {
		if (!phone) return ''
		const cleaned = phone.replace(/\D/g, '')
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
		}
		return phone
	})

	// Address formatter
	Handlebars.registerHelper('formatAddress', (address: LeaseFormData['property']['address']) => {
		if (!address) return ''
		const parts = []
		if (address.street) parts.push(address.street)
		if (address.unit) parts.push(`Unit ${address.unit}`)
		if (address.city && address.state && address.zipCode) {
			parts.push(`${address.city}, ${address.state} ${address.zipCode}`)
		}
		return parts.join(', ')
	})

	// Calculate lease duration in months
	Handlebars.registerHelper('leaseDuration', (startDate: string, endDate: string) => {
		if (!startDate || !endDate) return 'N/A'
		const start = new Date(startDate)
		const end = new Date(endDate)
		const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
		return `${months} month${months !== 1 ? 's' : ''}`
	})

	// Check if date is in the past
	Handlebars.registerHelper('isPastDate', (dateString: string) => {
		if (!dateString) return false
		return new Date(dateString) < new Date()
	})

	// Check if date is in the future
	Handlebars.registerHelper('isFutureDate', (dateString: string) => {
		if (!dateString) return false
		return new Date(dateString) > new Date()
	})

	// JSON stringify helper (for debugging)
	Handlebars.registerHelper('json', (context: Record<string, unknown>) => {
		return JSON.stringify(context, null, 2)
	})
}

/**
 * Compile a template with registered helpers
 */
export function compileTemplate(templateString: string): HandlebarsTemplateDelegate {
	// Ensure helpers are registered
	registerTemplateHelpers()
	
	// Compile and return the template
	return Handlebars.compile(templateString)
}

/**
 * Get state-specific notice periods and requirements
 * This is a simplified version - in production, this would be more comprehensive
 */
export function getStateRequirements(state: string): StateLeaseRequirements['noticePeriods'] {
	// Default notice periods (can be overridden per state)
	const defaults = {
		entryForInspection: 24,
		entryForRepairs: 24,
		monthToMonthTermination: 30,
		rentIncrease: 30
	}

	// State-specific overrides
	const stateOverrides: Record<string, StateLeaseRequirements['noticePeriods']> = {
		CA: {
			entryForInspection: 24,
			entryForRepairs: 24,
			monthToMonthTermination: 30,
			rentIncrease: 30
		},
		NY: {
			entryForInspection: 24,
			entryForRepairs: 24,
			monthToMonthTermination: 30,
			rentIncrease: 30
		},
		TX: {
			entryForInspection: 24,
			entryForRepairs: 24,
			monthToMonthTermination: 30,
			rentIncrease: 30
		},
		FL: {
			entryForInspection: 12,
			entryForRepairs: 12,
			monthToMonthTermination: 15,
			rentIncrease: 15
		}
		// Add more states as needed
	}

	return stateOverrides[state] || defaults
}

/**
 * Get required disclosures based on state and property details
 */
export function getRequiredDisclosures(state: string, propertyYear?: number): Array<{title: string; content: string}> {
	const disclosures = []

	// Federal lead paint disclosure (required for properties built before 1978)
	if (propertyYear && propertyYear < 1978) {
		disclosures.push({
			title: 'LEAD-BASED PAINT DISCLOSURE',
			content: `Federal law requires that you receive certain information about lead-based paint and lead-based paint hazards 
			before renting pre-1978 housing. Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, 
			and dust can pose health hazards if not managed properly. Lead exposure is especially harmful to young children and 
			pregnant women. Tenant acknowledges receipt of the EPA pamphlet "Protect Your Family from Lead in Your Home".`
		})
	}

	// State-specific disclosures
	const stateDisclosures: Record<string, Array<{title: string; content: string}>> = {
		CA: [
			{
				title: 'CALIFORNIA SPECIFIC DISCLOSURES',
				content: `Tenant has been informed of the existence of the Megan's Law database at www.meganslaw.ca.gov. 
				This property is located in a known flood, fire, earthquake, or other hazard zone: [TO BE SPECIFIED]. 
				Information about bed bugs can be found at www.cdph.ca.gov.`
			}
		],
		NY: [
			{
				title: 'NEW YORK SPECIFIC DISCLOSURES',
				content: `Tenant is entitled to receive a copy of the lease within 30 days of signing. 
				Information about bed bug infestation history is available upon request. 
				Sprinkler system status: [TO BE SPECIFIED].`
			}
		]
		// Add more state-specific disclosures as needed
	}

	if (stateDisclosures[state]) {
		disclosures.push(...stateDisclosures[state])
	}

	return disclosures
}