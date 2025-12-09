/**
 * Property-Based Tests for Wizard State Persistence
 *
 * Feature: lease-creation-wizard
 * Property 1: Wizard state persistence across navigation
 *
 * For any wizard step and any entered data, navigating to a previous step
 * and back to the current step should preserve all entered data unchanged.
 *
 * Validates: Requirements 1.3
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import type {
	SelectionStepData,
	TermsStepData,
	LeaseDetailsStepData,
	WizardStep
} from '@repo/shared/validation/lease-wizard.schemas'

// ============================================================================
// WIZARD STATE MANAGEMENT (extracted logic for testing)
// ============================================================================

/**
 * Represents the wizard state that should persist across navigation
 */
interface WizardState {
	currentStep: WizardStep
	selectionData: Partial<SelectionStepData>
	termsData: Partial<TermsStepData>
	detailsData: Partial<LeaseDetailsStepData>
}

const WIZARD_STEPS: WizardStep[] = ['selection', 'terms', 'details', 'review']

/**
 * Navigate to the next step (if possible)
 */
function goToNextStep(state: WizardState): WizardState {
	const currentIndex = WIZARD_STEPS.indexOf(state.currentStep)
	if (currentIndex < WIZARD_STEPS.length - 1) {
		return {
			...state,
			currentStep: WIZARD_STEPS[currentIndex + 1] as WizardStep
		}
	}
	return state
}

/**
 * Navigate to the previous step (if possible)
 */
function goToPreviousStep(state: WizardState): WizardState {
	const currentIndex = WIZARD_STEPS.indexOf(state.currentStep)
	if (currentIndex > 0) {
		return {
			...state,
			currentStep: WIZARD_STEPS[currentIndex - 1] as WizardStep
		}
	}
	return state
}

/**
 * Navigate to a specific step
 */
function goToStep(state: WizardState, step: WizardStep): WizardState {
	return {
		...state,
		currentStep: step
	}
}

/**
 * Update selection data
 */
function updateSelectionData(
	state: WizardState,
	data: Partial<SelectionStepData>
): WizardState {
	return {
		...state,
		selectionData: { ...state.selectionData, ...data }
	}
}

/**
 * Update terms data
 */
function updateTermsData(
	state: WizardState,
	data: Partial<TermsStepData>
): WizardState {
	return {
		...state,
		termsData: { ...state.termsData, ...data }
	}
}

/**
 * Update details data
 */
function updateDetailsData(
	state: WizardState,
	data: Partial<LeaseDetailsStepData>
): WizardState {
	return {
		...state,
		detailsData: { ...state.detailsData, ...data }
	}
}

// ============================================================================
// ARBITRARIES (data generators)
// ============================================================================

// Generate valid UUID
const validUuid = fc.uuid()

// Generate valid date string (YYYY-MM-DD)
const validDateString = fc.integer({ min: 0, max: 3650 }).map(daysFromBase => {
	const baseDate = new Date('2024-01-01')
	baseDate.setDate(baseDate.getDate() + daysFromBase)
	return baseDate.toISOString().split('T')[0] as string
})

// Generate valid selection step data
const selectionDataArb: fc.Arbitrary<Partial<SelectionStepData>> = fc.record(
	{
		property_id: validUuid,
		unit_id: validUuid,
		primary_tenant_id: validUuid
	},
	{ requiredKeys: [] }
)

// Generate valid terms step data
const termsDataArb: fc.Arbitrary<Partial<TermsStepData>> = fc.record(
	{
		start_date: validDateString,
		end_date: validDateString,
		rent_amount: fc.integer({ min: 1, max: 1000000 }),
		security_deposit: fc.integer({ min: 0, max: 1000000 }),
		payment_day: fc.integer({ min: 1, max: 31 }),
		grace_period_days: fc.integer({ min: 0, max: 30 }),
		late_fee_amount: fc.integer({ min: 0, max: 100000 })
	},
	{ requiredKeys: [] }
)

// Generate valid US state code
const usStateArb = fc.constantFrom(
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
	'DC'
) as fc.Arbitrary<
	| 'AL'
	| 'AK'
	| 'AZ'
	| 'AR'
	| 'CA'
	| 'CO'
	| 'CT'
	| 'DE'
	| 'FL'
	| 'GA'
	| 'HI'
	| 'ID'
	| 'IL'
	| 'IN'
	| 'IA'
	| 'KS'
	| 'KY'
	| 'LA'
	| 'ME'
	| 'MD'
	| 'MA'
	| 'MI'
	| 'MN'
	| 'MS'
	| 'MO'
	| 'MT'
	| 'NE'
	| 'NV'
	| 'NH'
	| 'NJ'
	| 'NM'
	| 'NY'
	| 'NC'
	| 'ND'
	| 'OH'
	| 'OK'
	| 'OR'
	| 'PA'
	| 'RI'
	| 'SC'
	| 'SD'
	| 'TN'
	| 'TX'
	| 'UT'
	| 'VT'
	| 'VA'
	| 'WA'
	| 'WV'
	| 'WI'
	| 'WY'
	| 'DC'
>

// Generate valid details step data
const detailsDataArb: fc.Arbitrary<Partial<LeaseDetailsStepData>> = fc.record(
	{
		max_occupants: fc.integer({ min: 1, max: 20 }),
		pets_allowed: fc.boolean(),
		pet_deposit: fc.integer({ min: 0, max: 100000 }),
		pet_rent: fc.integer({ min: 0, max: 10000 }),
		utilities_included: fc.array(
			fc.constantFrom(
				'electricity',
				'gas',
				'water',
				'sewer',
				'trash',
				'internet'
			),
			{ maxLength: 5 }
		),
		tenant_responsible_utilities: fc.array(
			fc.constantFrom(
				'electricity',
				'gas',
				'water',
				'sewer',
				'trash',
				'internet'
			),
			{ maxLength: 5 }
		),
		property_rules: fc.string({ maxLength: 500 }),
		property_built_before_1978: fc.boolean(),
		lead_paint_disclosure_acknowledged: fc.boolean(),
		governing_state: usStateArb
	},
	{ requiredKeys: [] }
)

// Generate wizard step
const wizardStepArb: fc.Arbitrary<WizardStep> = fc.constantFrom(
	'selection',
	'terms',
	'details',
	'review'
)

// Generate complete wizard state
const wizardStateArb: fc.Arbitrary<WizardState> = fc.record({
	currentStep: wizardStepArb,
	selectionData: selectionDataArb,
	termsData: termsDataArb,
	detailsData: detailsDataArb
})

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Lease Creation Wizard - Property Tests', () => {
	describe('Property 1: Wizard state persistence across navigation', () => {
		/**
		 * Property 1: Wizard state persistence across navigation
		 * For any wizard step and any entered data, navigating to a previous step
		 * and back to the current step should preserve all entered data unchanged.
		 * **Feature: lease-creation-wizard, Property 1: Wizard state persistence across navigation**
		 * **Validates: Requirements 1.3**
		 */

		it('should preserve selection data when navigating forward and back', async () => {
			await fc.assert(
				fc.asyncProperty(selectionDataArb, async selectionData => {
					// Start at selection step with data
					let state: WizardState = {
						currentStep: 'selection',
						selectionData,
						termsData: {},
						detailsData: {}
					}

					// Navigate forward to terms
					state = goToNextStep(state)
					expect(state.currentStep).toBe('terms')

					// Navigate back to selection
					state = goToPreviousStep(state)
					expect(state.currentStep).toBe('selection')

					// Verify selection data is preserved
					expect(state.selectionData).toEqual(selectionData)
				}),
				{ numRuns: 100 }
			)
		})

		it('should preserve terms data when navigating forward and back', async () => {
			await fc.assert(
				fc.asyncProperty(termsDataArb, async termsData => {
					// Start at terms step with data
					let state: WizardState = {
						currentStep: 'terms',
						selectionData: {},
						termsData,
						detailsData: {}
					}

					// Navigate forward to details
					state = goToNextStep(state)
					expect(state.currentStep).toBe('details')

					// Navigate back to terms
					state = goToPreviousStep(state)
					expect(state.currentStep).toBe('terms')

					// Verify terms data is preserved
					expect(state.termsData).toEqual(termsData)
				}),
				{ numRuns: 100 }
			)
		})

		it('should preserve details data when navigating forward and back', async () => {
			await fc.assert(
				fc.asyncProperty(detailsDataArb, async detailsData => {
					// Start at details step with data
					let state: WizardState = {
						currentStep: 'details',
						selectionData: {},
						termsData: {},
						detailsData
					}

					// Navigate forward to review
					state = goToNextStep(state)
					expect(state.currentStep).toBe('review')

					// Navigate back to details
					state = goToPreviousStep(state)
					expect(state.currentStep).toBe('details')

					// Verify details data is preserved
					expect(state.detailsData).toEqual(detailsData)
				}),
				{ numRuns: 100 }
			)
		})

		it('should preserve all data across multiple navigation cycles', async () => {
			await fc.assert(
				fc.asyncProperty(wizardStateArb, async initialState => {
					let state = { ...initialState }
					const originalSelectionData = { ...state.selectionData }
					const originalTermsData = { ...state.termsData }
					const originalDetailsData = { ...state.detailsData }

					// Navigate through all steps forward
					state = goToStep(state, 'selection')
					state = goToNextStep(state) // -> terms
					state = goToNextStep(state) // -> details
					state = goToNextStep(state) // -> review

					// Navigate back through all steps
					state = goToPreviousStep(state) // -> details
					state = goToPreviousStep(state) // -> terms
					state = goToPreviousStep(state) // -> selection

					// Verify all data is preserved
					expect(state.selectionData).toEqual(originalSelectionData)
					expect(state.termsData).toEqual(originalTermsData)
					expect(state.detailsData).toEqual(originalDetailsData)
				}),
				{ numRuns: 100 }
			)
		})

		it('should preserve data when jumping directly to any step', async () => {
			await fc.assert(
				fc.asyncProperty(
					wizardStateArb,
					wizardStepArb,
					async (initialState, targetStep) => {
						const originalSelectionData = { ...initialState.selectionData }
						const originalTermsData = { ...initialState.termsData }
						const originalDetailsData = { ...initialState.detailsData }

						// Jump directly to target step
						const state = goToStep(initialState, targetStep)

						// Verify step changed
						expect(state.currentStep).toBe(targetStep)

						// Verify all data is preserved
						expect(state.selectionData).toEqual(originalSelectionData)
						expect(state.termsData).toEqual(originalTermsData)
						expect(state.detailsData).toEqual(originalDetailsData)
					}
				),
				{ numRuns: 100 }
			)
		})

		it('should preserve data after updating and navigating', async () => {
			await fc.assert(
				fc.asyncProperty(
					selectionDataArb,
					termsDataArb,
					detailsDataArb,
					async (selectionData, termsData, detailsData) => {
						// Start with empty state
						let state: WizardState = {
							currentStep: 'selection',
							selectionData: {},
							termsData: {},
							detailsData: {}
						}

						// Update selection data and navigate forward
						state = updateSelectionData(state, selectionData)
						state = goToNextStep(state) // -> terms

						// Update terms data and navigate forward
						state = updateTermsData(state, termsData)
						state = goToNextStep(state) // -> details

						// Update details data and navigate forward
						state = updateDetailsData(state, detailsData)
						state = goToNextStep(state) // -> review

						// Navigate all the way back
						state = goToPreviousStep(state) // -> details
						state = goToPreviousStep(state) // -> terms
						state = goToPreviousStep(state) // -> selection

						// Verify all data is preserved
						expect(state.selectionData).toEqual(selectionData)
						expect(state.termsData).toEqual(termsData)
						expect(state.detailsData).toEqual(detailsData)
					}
				),
				{ numRuns: 100 }
			)
		})

		it('should not modify data when navigation is at boundary', async () => {
			await fc.assert(
				fc.asyncProperty(wizardStateArb, async initialState => {
					// Test going back from first step
					const stateAtFirst: WizardState = {
						...initialState,
						currentStep: 'selection'
					}
					const afterBackFromFirst = goToPreviousStep(stateAtFirst)

					// Should stay at selection and preserve data
					expect(afterBackFromFirst.currentStep).toBe('selection')
					expect(afterBackFromFirst.selectionData).toEqual(
						stateAtFirst.selectionData
					)
					expect(afterBackFromFirst.termsData).toEqual(stateAtFirst.termsData)
					expect(afterBackFromFirst.detailsData).toEqual(
						stateAtFirst.detailsData
					)

					// Test going forward from last step
					const stateAtLast: WizardState = {
						...initialState,
						currentStep: 'review'
					}
					const afterForwardFromLast = goToNextStep(stateAtLast)

					// Should stay at review and preserve data
					expect(afterForwardFromLast.currentStep).toBe('review')
					expect(afterForwardFromLast.selectionData).toEqual(
						stateAtLast.selectionData
					)
					expect(afterForwardFromLast.termsData).toEqual(stateAtLast.termsData)
					expect(afterForwardFromLast.detailsData).toEqual(
						stateAtLast.detailsData
					)
				}),
				{ numRuns: 100 }
			)
		})
	})
})
