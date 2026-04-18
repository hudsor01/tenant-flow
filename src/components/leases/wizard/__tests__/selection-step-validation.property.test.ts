/**
 * Property-Based Tests for Selection Step Validation
 *
 * Feature: lease-creation-wizard
 * Property 4: Selection step validation
 *
 * For any combination of property, unit, and tenant selections,
 * the Next button is enabled if and only if all three selections are non-empty.
 *
 * Validates: Requirements 2.4, 2.5
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { selectionStepSchema } from '#lib/validation/lease-wizard.schemas'
import type { SelectionStepData } from '#lib/validation/lease-wizard.schemas'

// Mirrors the validation logic used in the wizard component.
function isSelectionStepValid(data: Partial<SelectionStepData>): boolean {
	const hasProperty = !!data.property_id && data.property_id.trim() !== ''
	const hasUnit = !!data.unit_id && data.unit_id.trim() !== ''
	const hasTenant =
		!!data.primary_tenant_id && data.primary_tenant_id.trim() !== ''

	return hasProperty && hasUnit && hasTenant
}

function validateSelectionWithSchema(
	data: Partial<SelectionStepData>
): boolean {
	const result = selectionStepSchema.safeParse(data)
	return result.success
}

const validUuid = fc.uuid()

const emptyOrWhitespace = fc.constantFrom('', ' ', '  ', '\t', '\n')

const completeSelectionDataArb: fc.Arbitrary<SelectionStepData> = fc.record({
	property_id: validUuid,
	unit_id: validUuid,
	primary_tenant_id: validUuid
})

const incompleteSelectionDataArb: fc.Arbitrary<Partial<SelectionStepData>> =
	fc.oneof(
		fc.record({
			unit_id: validUuid,
			primary_tenant_id: validUuid
		}),
		fc.record({
			property_id: validUuid,
			primary_tenant_id: validUuid
		}),
		fc.record({
			property_id: validUuid,
			unit_id: validUuid
		}),
		fc.record({
			property_id: validUuid
		}),
		fc.record({
			unit_id: validUuid
		}),
		fc.record({
			primary_tenant_id: validUuid
		}),
		fc.constant({})
	)

const selectionWithEmptyValuesArb: fc.Arbitrary<Partial<SelectionStepData>> =
	fc.oneof(
		fc.record({
			property_id: emptyOrWhitespace,
			unit_id: validUuid,
			primary_tenant_id: validUuid
		}),
		fc.record({
			property_id: validUuid,
			unit_id: emptyOrWhitespace,
			primary_tenant_id: validUuid
		}),
		fc.record({
			property_id: validUuid,
			unit_id: validUuid,
			primary_tenant_id: emptyOrWhitespace
		})
	)

describe('Lease Creation Wizard - Selection Step Validation', () => {
	describe('Property 4: Selection step validation', () => {
		/**
		 * Property 4: Selection step validation
		 * For any combination of property, unit, and tenant selections,
		 * the Next button is enabled if and only if all three selections are non-empty.
		 * **Feature: lease-creation-wizard, Property 4: Selection step validation**
		 * **Validates: Requirements 2.4, 2.5**
		 */

		it('should enable Next button when all three selections are valid UUIDs', async () => {
			await fc.assert(
				fc.asyncProperty(completeSelectionDataArb, async selectionData => {
					// When all three selections are made with valid UUIDs
					const isValid = isSelectionStepValid(selectionData)

					// Then the selection step should be valid (Next button enabled)
					expect(isValid).toBe(true)

					// And the schema validation should also pass
					const schemaValid = validateSelectionWithSchema(selectionData)
					expect(schemaValid).toBe(true)
				}),
				{ numRuns: 100 }
			)
		})

		it('should disable Next button when any selection is missing', async () => {
			await fc.assert(
				fc.asyncProperty(incompleteSelectionDataArb, async selectionData => {
					// When any selection is missing
					const isValid = isSelectionStepValid(selectionData)

					// Then the selection step should be invalid (Next button disabled)
					expect(isValid).toBe(false)
				}),
				{ numRuns: 100 }
			)
		})

		it('should disable Next button when any selection is empty or whitespace', async () => {
			await fc.assert(
				fc.asyncProperty(selectionWithEmptyValuesArb, async selectionData => {
					// When any selection is empty or whitespace
					const isValid = isSelectionStepValid(selectionData)

					// Then the selection step should be invalid (Next button disabled)
					expect(isValid).toBe(false)
				}),
				{ numRuns: 100 }
			)
		})

		it('should have consistent validation between custom logic and schema', async () => {
			await fc.assert(
				fc.asyncProperty(completeSelectionDataArb, async selectionData => {
					// For complete data, both validations should agree
					const customValid = isSelectionStepValid(selectionData)
					const schemaValid = validateSelectionWithSchema(selectionData)

					// Both should be true for complete valid data
					expect(customValid).toBe(schemaValid)
				}),
				{ numRuns: 100 }
			)
		})

		it('should correctly identify which fields are missing', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.record(
						{
							property_id: fc.option(validUuid, { nil: undefined }),
							unit_id: fc.option(validUuid, { nil: undefined }),
							primary_tenant_id: fc.option(validUuid, { nil: undefined })
						},
						{ requiredKeys: [] }
					),
					async selectionData => {
						const hasProperty = !!selectionData.property_id
						const hasUnit = !!selectionData.unit_id
						const hasTenant = !!selectionData.primary_tenant_id

						// Filter out undefined values to satisfy exactOptionalPropertyTypes
						const cleanedData: Partial<SelectionStepData> = {}
						if (selectionData.property_id)
							cleanedData.property_id = selectionData.property_id
						if (selectionData.unit_id)
							cleanedData.unit_id = selectionData.unit_id
						if (selectionData.primary_tenant_id)
							cleanedData.primary_tenant_id = selectionData.primary_tenant_id

						const isValid = isSelectionStepValid(cleanedData)

						// The step is valid if and only if all three are present
						expect(isValid).toBe(hasProperty && hasUnit && hasTenant)
					}
				),
				{ numRuns: 100 }
			)
		})

		it('should handle undefined values correctly', async () => {
			// Test specific edge cases with missing properties
			const testCases: Partial<SelectionStepData>[] = [
				{},
				{},
				{ property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
				{ unit_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
				{ primary_tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }
			]

			for (const testCase of testCases) {
				const isValid = isSelectionStepValid(testCase)
				expect(isValid).toBe(false)
			}
		})
	})
})
