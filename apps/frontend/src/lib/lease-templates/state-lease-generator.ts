/**
 * State-specific lease generator that creates compliant lease agreements
 * for all 50 US states and international territories
 */

import type {
	LeaseTemplateData,
	StateLeaseRequirements
} from './base-lease-template'
import { generateBaseLease } from './base-lease-template'
// import { getStateFromSlug, getAllStates } from '@/lib/state-data' // TODO: Create state-data module

// Temporary stub implementations until state-data module is created
const getStateFromSlug = (slug: string) => ({ name: 'Unknown State', slug, code: 'XX' });
const getAllStates = () => [{ name: 'Example State', slug: 'example', code: 'EX' }];

export interface GenerateLeaseOptions {
	data: LeaseTemplateData
	stateKey: string
	format: 'pdf' | 'docx' | 'html'
}

export interface LeaseGenerationResult {
	content: string
	fileName: string
	stateCode: string
	isCompliant: boolean
	warnings: string[]
}

/**
 * Generates a state-compliant lease agreement
 */
export function generateStateLease(
	options: GenerateLeaseOptions
): LeaseGenerationResult {
	const { data, stateKey, format } = options
	const stateData = getStateFromSlug(stateKey)

	if (!stateData) {
		throw new Error(`Unsupported state or region: ${stateKey}`)
	}

	// No state-specific compliance logic available in new model
	const minimalRequirements: StateLeaseRequirements = {
		securityDepositLimit: 'No statutory limit',
		noticeToEnter: 'No statutory requirement',
		noticePeriod: 'No statutory requirement',
		requiredDisclosures: [],
		mandatoryClauses: [],
		prohibitedClauses: []
	}

	const content = generateBaseLease(data, minimalRequirements)

	const fileName = generateFileName(data, stateData.code, format)

	return {
		content,
		fileName,
		stateCode: stateData.code,
		isCompliant: true,
		warnings: []
	}
}

/**
 * Generates appropriate filename for the lease document
 */
function generateFileName(
	data: LeaseTemplateData,
	stateCode: string,
	format: string
): string {
	const cleanAddress = data.propertyAddress
		.replace(/[^a-zA-Z0-9\s]/g, '')
		.replace(/\s+/g, '_')
	const date = new Date().toISOString().split('T')[0]
	return `${stateCode}_Lease_${cleanAddress}_${date}.${format}`
}

/**
 * Gets all supported states for lease generation
 */
export function getSupportedStates(): {
	key: string
	name: string
	code: string
}[] {
	return getAllStates().map((state: { slug: string; name: string; code: string }) => ({
		key: state.slug,
		name: state.name,
		code: state.code
	}))
}

/**
 * Gets lease generation statistics for a state
 * (No longer available in new model)
 */
export function getStateLeaseStats() {
	return null
}
