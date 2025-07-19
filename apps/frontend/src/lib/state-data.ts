export interface StateInfo {
	name: string
	slug: string
	code: string
	legalRequirements?: {
		disclosures?: string[]
		requirements?: string[]
		notices?: string[]
		keyDisclosures?: string[]
		securityDepositLimit?: string
		noticeToEnter?: string
		noticePeriod?: string
	}
	marketSize?: number
	searchVolume?: number
}

const STATES: StateInfo[] = [
	{ name: 'Texas', slug: 'texas', code: 'TX' },
	{ name: 'California', slug: 'california', code: 'CA' },
	{ name: 'Florida', slug: 'florida', code: 'FL' },
	{ name: 'New York', slug: 'new-york', code: 'NY' },
	// Add more states as needed
]

export function getStateFromSlug(slug: string): StateInfo | undefined {
	return STATES.find(state => state.slug === slug)
}

export function isValidState(slug: string): boolean {
	return STATES.some(state => state.slug === slug)
}

export function getAllStates(): StateInfo[] {
	return STATES
}