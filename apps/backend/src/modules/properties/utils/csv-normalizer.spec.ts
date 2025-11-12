import type { PropertyType } from '@repo/shared/types/core'
import {
	normalizePropertyCsvRow,
	normalizePropertyType,
	VALID_PROPERTY_TYPES
} from './csv-normalizer'

describe('CSV normalizer utilities', () => {
	describe('normalizePropertyCsvRow', () => {
		it('strips BOM characters and normalizes header casing', () => {
			const row = {
				'\uFEFFName': 'Sample Property',
				'ZIP Code': '75201',
				City: 'Dallas',
				State: 'TX'
			}

			expect(normalizePropertyCsvRow(row)).toEqual({
				name: 'Sample Property',
				zipCode: '75201',
				city: 'Dallas',
				state: 'TX'
			})
		})

		it('maps common header aliases used in spreadsheets', () => {
			const row = {
				'Property Name': 'North Ridge',
				Street: '123 Main St',
				Municipality: 'Seattle',
				Province: 'WA',
				PostCode: '98104',
				'Property Type': 'single family',
				Notes: 'Great view'
			}

			expect(normalizePropertyCsvRow(row)).toEqual({
				name: 'North Ridge',
				address: '123 Main St',
				city: 'Seattle',
				state: 'WA',
				zipCode: '98104',
				propertyType: 'single family',
				description: 'Great view'
			})
		})

		it('ignores columns that are not part of the import schema', () => {
			const row = {
				Name: 'Willow Creek',
				address: '1 Test Rd',
				customColumn: 'should be ignored'
			}

			expect(normalizePropertyCsvRow(row)).toEqual({
				name: 'Willow Creek',
				address: '1 Test Rd'
			})
		})
	})

	describe('normalizePropertyType', () => {
		const assertType = (input: string, expected: PropertyType | null) => {
			expect(normalizePropertyType(input)).toBe(expected)
		}

		it('normalizes friendly names to enum values', () => {
			assertType('single family', 'SINGLE_FAMILY')
			assertType('Townhome', 'TOWNHOUSE')
			assertType('multi-family', 'MULTI_UNIT')
		})

		it('accepts already-valid enum casing', () => {
			for (const type of VALID_PROPERTY_TYPES) {
				assertType(type, type)
			}
		})

		it('returns null for unsupported property types', () => {
			assertType('Loft', null)
			assertType('', null)
			assertType('   ', null)
		})
	})
})
