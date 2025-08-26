/**
 * US State Data Module
 * Provides state information for lease generation and location services
 */

export interface StateInfo {
	name: string
	slug: string
	code: string
	fullName?: string
}

const US_STATES: StateInfo[] = [
	{ name: 'Alabama', slug: 'alabama', code: 'AL', fullName: 'Alabama' },
	{ name: 'Alaska', slug: 'alaska', code: 'AK', fullName: 'Alaska' },
	{ name: 'Arizona', slug: 'arizona', code: 'AZ', fullName: 'Arizona' },
	{ name: 'Arkansas', slug: 'arkansas', code: 'AR', fullName: 'Arkansas' },
<<<<<<< HEAD
	{
		name: 'California',
		slug: 'california',
		code: 'CA',
		fullName: 'California'
	},
	{ name: 'Colorado', slug: 'colorado', code: 'CO', fullName: 'Colorado' },
	{
		name: 'Connecticut',
		slug: 'connecticut',
		code: 'CT',
		fullName: 'Connecticut'
	},
=======
	{ name: 'California', slug: 'california', code: 'CA', fullName: 'California' },
	{ name: 'Colorado', slug: 'colorado', code: 'CO', fullName: 'Colorado' },
	{ name: 'Connecticut', slug: 'connecticut', code: 'CT', fullName: 'Connecticut' },
>>>>>>> origin/main
	{ name: 'Delaware', slug: 'delaware', code: 'DE', fullName: 'Delaware' },
	{ name: 'Florida', slug: 'florida', code: 'FL', fullName: 'Florida' },
	{ name: 'Georgia', slug: 'georgia', code: 'GA', fullName: 'Georgia' },
	{ name: 'Hawaii', slug: 'hawaii', code: 'HI', fullName: 'Hawaii' },
	{ name: 'Idaho', slug: 'idaho', code: 'ID', fullName: 'Idaho' },
	{ name: 'Illinois', slug: 'illinois', code: 'IL', fullName: 'Illinois' },
	{ name: 'Indiana', slug: 'indiana', code: 'IN', fullName: 'Indiana' },
	{ name: 'Iowa', slug: 'iowa', code: 'IA', fullName: 'Iowa' },
	{ name: 'Kansas', slug: 'kansas', code: 'KS', fullName: 'Kansas' },
	{ name: 'Kentucky', slug: 'kentucky', code: 'KY', fullName: 'Kentucky' },
	{ name: 'Louisiana', slug: 'louisiana', code: 'LA', fullName: 'Louisiana' },
	{ name: 'Maine', slug: 'maine', code: 'ME', fullName: 'Maine' },
	{ name: 'Maryland', slug: 'maryland', code: 'MD', fullName: 'Maryland' },
<<<<<<< HEAD
	{
		name: 'Massachusetts',
		slug: 'massachusetts',
		code: 'MA',
		fullName: 'Massachusetts'
	},
	{ name: 'Michigan', slug: 'michigan', code: 'MI', fullName: 'Michigan' },
	{ name: 'Minnesota', slug: 'minnesota', code: 'MN', fullName: 'Minnesota' },
	{
		name: 'Mississippi',
		slug: 'mississippi',
		code: 'MS',
		fullName: 'Mississippi'
	},
=======
	{ name: 'Massachusetts', slug: 'massachusetts', code: 'MA', fullName: 'Massachusetts' },
	{ name: 'Michigan', slug: 'michigan', code: 'MI', fullName: 'Michigan' },
	{ name: 'Minnesota', slug: 'minnesota', code: 'MN', fullName: 'Minnesota' },
	{ name: 'Mississippi', slug: 'mississippi', code: 'MS', fullName: 'Mississippi' },
>>>>>>> origin/main
	{ name: 'Missouri', slug: 'missouri', code: 'MO', fullName: 'Missouri' },
	{ name: 'Montana', slug: 'montana', code: 'MT', fullName: 'Montana' },
	{ name: 'Nebraska', slug: 'nebraska', code: 'NE', fullName: 'Nebraska' },
	{ name: 'Nevada', slug: 'nevada', code: 'NV', fullName: 'Nevada' },
<<<<<<< HEAD
	{
		name: 'New Hampshire',
		slug: 'new-hampshire',
		code: 'NH',
		fullName: 'New Hampshire'
	},
	{
		name: 'New Jersey',
		slug: 'new-jersey',
		code: 'NJ',
		fullName: 'New Jersey'
	},
	{
		name: 'New Mexico',
		slug: 'new-mexico',
		code: 'NM',
		fullName: 'New Mexico'
	},
	{ name: 'New York', slug: 'new-york', code: 'NY', fullName: 'New York' },
	{
		name: 'North Carolina',
		slug: 'north-carolina',
		code: 'NC',
		fullName: 'North Carolina'
	},
	{
		name: 'North Dakota',
		slug: 'north-dakota',
		code: 'ND',
		fullName: 'North Dakota'
	},
	{ name: 'Ohio', slug: 'ohio', code: 'OH', fullName: 'Ohio' },
	{ name: 'Oklahoma', slug: 'oklahoma', code: 'OK', fullName: 'Oklahoma' },
	{ name: 'Oregon', slug: 'oregon', code: 'OR', fullName: 'Oregon' },
	{
		name: 'Pennsylvania',
		slug: 'pennsylvania',
		code: 'PA',
		fullName: 'Pennsylvania'
	},
	{
		name: 'Rhode Island',
		slug: 'rhode-island',
		code: 'RI',
		fullName: 'Rhode Island'
	},
	{
		name: 'South Carolina',
		slug: 'south-carolina',
		code: 'SC',
		fullName: 'South Carolina'
	},
	{
		name: 'South Dakota',
		slug: 'south-dakota',
		code: 'SD',
		fullName: 'South Dakota'
	},
=======
	{ name: 'New Hampshire', slug: 'new-hampshire', code: 'NH', fullName: 'New Hampshire' },
	{ name: 'New Jersey', slug: 'new-jersey', code: 'NJ', fullName: 'New Jersey' },
	{ name: 'New Mexico', slug: 'new-mexico', code: 'NM', fullName: 'New Mexico' },
	{ name: 'New York', slug: 'new-york', code: 'NY', fullName: 'New York' },
	{ name: 'North Carolina', slug: 'north-carolina', code: 'NC', fullName: 'North Carolina' },
	{ name: 'North Dakota', slug: 'north-dakota', code: 'ND', fullName: 'North Dakota' },
	{ name: 'Ohio', slug: 'ohio', code: 'OH', fullName: 'Ohio' },
	{ name: 'Oklahoma', slug: 'oklahoma', code: 'OK', fullName: 'Oklahoma' },
	{ name: 'Oregon', slug: 'oregon', code: 'OR', fullName: 'Oregon' },
	{ name: 'Pennsylvania', slug: 'pennsylvania', code: 'PA', fullName: 'Pennsylvania' },
	{ name: 'Rhode Island', slug: 'rhode-island', code: 'RI', fullName: 'Rhode Island' },
	{ name: 'South Carolina', slug: 'south-carolina', code: 'SC', fullName: 'South Carolina' },
	{ name: 'South Dakota', slug: 'south-dakota', code: 'SD', fullName: 'South Dakota' },
>>>>>>> origin/main
	{ name: 'Tennessee', slug: 'tennessee', code: 'TN', fullName: 'Tennessee' },
	{ name: 'Texas', slug: 'texas', code: 'TX', fullName: 'Texas' },
	{ name: 'Utah', slug: 'utah', code: 'UT', fullName: 'Utah' },
	{ name: 'Vermont', slug: 'vermont', code: 'VT', fullName: 'Vermont' },
	{ name: 'Virginia', slug: 'virginia', code: 'VA', fullName: 'Virginia' },
<<<<<<< HEAD
	{
		name: 'Washington',
		slug: 'washington',
		code: 'WA',
		fullName: 'Washington'
	},
	{
		name: 'West Virginia',
		slug: 'west-virginia',
		code: 'WV',
		fullName: 'West Virginia'
	},
=======
	{ name: 'Washington', slug: 'washington', code: 'WA', fullName: 'Washington' },
	{ name: 'West Virginia', slug: 'west-virginia', code: 'WV', fullName: 'West Virginia' },
>>>>>>> origin/main
	{ name: 'Wisconsin', slug: 'wisconsin', code: 'WI', fullName: 'Wisconsin' },
	{ name: 'Wyoming', slug: 'wyoming', code: 'WY', fullName: 'Wyoming' }
]

/**
 * Get state information by slug
 */
export function getStateFromSlug(slug: string): StateInfo | undefined {
	return US_STATES.find(state => state.slug === slug)
}

/**
 * Get state information by code
 */
export function getStateFromCode(code: string): StateInfo | undefined {
	return US_STATES.find(state => state.code === code.toUpperCase())
}

/**
 * Get all US states
 */
export function getAllStates(): StateInfo[] {
	return US_STATES
}

/**
 * Get states by partial name match
 */
export function searchStates(query: string): StateInfo[] {
	const normalizedQuery = query.toLowerCase()
<<<<<<< HEAD
	return US_STATES.filter(
		state =>
			state.name.toLowerCase().includes(normalizedQuery) ||
			state.slug.includes(normalizedQuery) ||
			state.code.toLowerCase().includes(normalizedQuery)
	)
}
=======
	return US_STATES.filter(state => 
		state.name.toLowerCase().includes(normalizedQuery) ||
		state.slug.includes(normalizedQuery) ||
		state.code.toLowerCase().includes(normalizedQuery)
	)
}
>>>>>>> origin/main
