import type { PropertyType } from '@repo/shared/types/core'

export type PropertyCsvField =
	| 'name'
	| 'address'
	| 'city'
	| 'state'
	| 'zipCode'
	| 'propertyType'
	| 'description'

export type NormalizedPropertyCsvRow = Partial<Record<PropertyCsvField, string>>

const CSV_FIELD_ALIASES: Record<string, PropertyCsvField> = {
	name: 'name',
	propertyname: 'name',
	propertytitle: 'name',
	property: 'name',
	address: 'address',
	address1: 'address',
	addressline1: 'address',
	street: 'address',
	streetaddress: 'address',
	line1: 'address',
	city: 'city',
	town: 'city',
	municipality: 'city',
	state: 'state',
	province: 'state',
	region: 'state',
	zipcode: 'zipCode',
	zip: 'zipCode',
	postcode: 'zipCode',
	postalcode: 'zipCode',
	postal: 'zipCode',
	propertytype: 'propertyType',
	type: 'propertyType',
	propertycategory: 'propertyType',
	propertyclass: 'propertyType',
	description: 'description',
	details: 'description',
	notes: 'description'
}

const BOM_REGEX = /^\uFEFF/
const NON_ALPHANUMERIC = /[^a-z0-9]/gi

const PROPERTY_TYPE_ALIASES: Record<string, PropertyType> = {
	singlefamily: 'SINGLE_FAMILY',
	singlefamilyhome: 'SINGLE_FAMILY',
	singlefamilyproperty: 'SINGLE_FAMILY',
	singlefamilyresidence: 'SINGLE_FAMILY',
	multiunit: 'MULTI_UNIT',
	multifamily: 'MULTI_UNIT',
	multifamilyproperty: 'MULTI_UNIT',
	multifamilyhome: 'MULTI_UNIT',
	apartment: 'APARTMENT',
	apartmentbuilding: 'APARTMENT',
	apartmentcommunity: 'APARTMENT',
	commercial: 'COMMERCIAL',
	commercialproperty: 'COMMERCIAL',
	mixeduse: 'COMMERCIAL',
	condo: 'CONDO',
	condominium: 'CONDO',
	townhouse: 'TOWNHOUSE',
	townhome: 'TOWNHOUSE',
	rowhouse: 'TOWNHOUSE',
	other: 'OTHER',
	mixed: 'OTHER'
}

export const VALID_PROPERTY_TYPES: PropertyType[] = [
	'SINGLE_FAMILY',
	'MULTI_UNIT',
	'APARTMENT',
	'COMMERCIAL',
	'CONDO',
	'TOWNHOUSE',
	'OTHER'
]

const sanitizeKey = (key: string | undefined | null): string => {
	if (!key) return ''
	return key.replace(BOM_REGEX, '').trim().toLowerCase().replace(NON_ALPHANUMERIC, '')
}

/**
 * Normalize CSV row headers so templates from Excel/Sheets (which often include BOMs
 * or mixed casing) map to the canonical property import fields.
 */
export function normalizePropertyCsvRow(
	row: Record<string, string | null | undefined>
): NormalizedPropertyCsvRow {
	const normalized: NormalizedPropertyCsvRow = {}

	for (const [rawKey, value] of Object.entries(row)) {
		if (value === undefined || value === null) continue

		const sanitizedKey = sanitizeKey(rawKey)
		const canonicalKey = CSV_FIELD_ALIASES[sanitizedKey]

		if (canonicalKey) {
			normalized[canonicalKey] = value
		}
	}

	return normalized
}

/**
 * Normalize user-provided property type values to the expected enum.
 * Accepts friendly names like "Single Family" or lowercase enum values.
 */
export function normalizePropertyType(value: string | undefined | null): PropertyType | null {
	if (!value) return null

	const trimmed = value.replace(BOM_REGEX, '').trim()
	if (!trimmed) return null

	const sanitized = trimmed.toLowerCase().replace(NON_ALPHANUMERIC, '')
	const aliasMatch = PROPERTY_TYPE_ALIASES[sanitized]
	if (aliasMatch) {
		return aliasMatch
	}

	const upperValue = trimmed.toUpperCase()
	return VALID_PROPERTY_TYPES.includes(upperValue as PropertyType)
		? (upperValue as PropertyType)
		: null
}
