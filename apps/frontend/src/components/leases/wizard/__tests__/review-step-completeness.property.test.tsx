/**
 * Property 9: ReviewStep Data Completeness
 * Feature: lease-creation-wizard, Property 9: Review step data completeness
 * Validates: Requirements 5.1, 5.2
 *
 * For any valid lease wizard data, the ReviewStep must display all entered information
 * correctly formatted and without data loss.
 */

import * as fc from 'fast-check'
import { render, screen, cleanup, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ReviewStep } from '../review-step'
import type { LeaseWizardData } from '@repo/shared/validation/lease-wizard.schemas'

// Note: Global afterEach cleanup is handled by unit-setup.ts.
// Manual cleanup() calls in loops are required for property-based iterations.

describe('Property 9: ReviewStep Data Completeness', () => {
	/**
	 * Property 9a: For any valid lease data, property and tenant names must be displayed.
	 */
	it('should display property, unit, and tenant names when provided', () => {
		// Use distinct, realistic test cases to avoid DOM element collision issues
		const testCases = [
			{
				propertyName: 'Sunset Apartments',
				unitNumber: 'A101',
				tenantName: 'John Smith'
			},
			{
				propertyName: 'Oak Grove Estates',
				unitNumber: '2B',
				tenantName: 'Maria Garcia'
			},
			{
				propertyName: 'Downtown Lofts',
				unitNumber: '305',
				tenantName: 'Robert Johnson'
			},
			{
				propertyName: 'Riverside Condos',
				unitNumber: 'PH1',
				tenantName: 'Emily Chen'
			},
			{
				propertyName: 'Highland Park Homes',
				unitNumber: '12',
				tenantName: 'Michael Brown'
			}
		]

		for (const { propertyName, unitNumber, tenantName } of testCases) {
			const data: Partial<LeaseWizardData> = {
				governing_state: 'TX'
			}

			render(
				<ReviewStep
					data={data}
					propertyName={propertyName}
					unitNumber={unitNumber}
					tenantName={tenantName}
				/>
			)

			// PROPERTY ASSERTION: All names should be displayed
			expect(screen.getByText(propertyName)).toBeInTheDocument()
			expect(screen.getByText(unitNumber)).toBeInTheDocument()
			expect(screen.getByText(tenantName)).toBeInTheDocument()

			cleanup()
		}
	})

	/**
	 * Property 9b: For any currency amount, it must be formatted correctly as USD.
	 * Uses `within` to scope queries to the Financial Terms section to avoid
	 * multiple element matches when the same currency value appears in different sections.
	 */
	it('should format all currency amounts correctly', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					rent_amount: fc.integer({ min: 10000, max: 1000000 }), // $100 - $10,000
					security_deposit: fc.integer({ min: 0, max: 1000000 }),
					late_fee_amount: fc.option(fc.integer({ min: 100, max: 50000 }))
				}),
				async ({ rent_amount, security_deposit, late_fee_amount }) => {
					const data: Partial<LeaseWizardData> = {
						rent_amount,
						security_deposit,
						...(late_fee_amount !== null && { late_fee_amount }),
						payment_day: 1,
						governing_state: 'TX'
					}

					render(<ReviewStep data={data} />)

					// Format expected values
					const formatCurrency = (cents: number) =>
						new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD'
						}).format(cents / 100)

					// Use within to scope queries to Financial Terms section
					// This avoids "multiple elements found" errors when same values appear elsewhere
					// Use getAllByText and take the last element to handle any DOM cleanup timing issues
					const financialHeadings = screen.getAllByText('Financial Terms')
					const financialSection =
						financialHeadings[financialHeadings.length - 1]!.closest(
							'div'
						)!.parentElement!
					const financialQueries = within(financialSection)

					// PROPERTY ASSERTION: Rent amount should be displayed correctly in Financial Terms
					expect(
						financialQueries.getByText(formatCurrency(rent_amount))
					).toBeInTheDocument()

					// PROPERTY ASSERTION: Security deposit should be displayed correctly
					// Use getAllByText since security_deposit=0 ($0.00) may match '-' placeholder elsewhere
					const securityDepositText = formatCurrency(security_deposit)
					const securityMatches =
						financialQueries.getAllByText(securityDepositText)
					expect(securityMatches.length).toBeGreaterThanOrEqual(1)

					// PROPERTY ASSERTION: Late fee should be displayed if provided
					if (late_fee_amount !== null) {
						const lateFeeText = formatCurrency(late_fee_amount)
						const lateFeeMatches = financialQueries.getAllByText(lateFeeText)
						expect(lateFeeMatches.length).toBeGreaterThanOrEqual(1)
					}

					cleanup()
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 9c: For any valid dates, they must be formatted as human-readable strings.
	 */
	it('should format all dates correctly', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					start_date: fc
						.date({
							noInvalidDate: true,
							min: new Date('2024-01-01'),
							max: new Date('2026-12-31')
						})
						.map(d => d.toISOString().split('T')[0]!),
					end_date: fc
						.date({
							noInvalidDate: true,
							min: new Date('2025-01-01'),
							max: new Date('2027-12-31')
						})
						.map(d => d.toISOString().split('T')[0]!)
				}),
				async ({ start_date, end_date }) => {
					const data: Partial<LeaseWizardData> = {
						start_date,
						end_date,
						governing_state: 'TX'
					}

					render(<ReviewStep data={data} />)

					// Format expected dates
					const formatDate = (dateStr: string) =>
						new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})

					// PROPERTY ASSERTION: Start date should be formatted
					// Use getAllByText since start_date and end_date may format to the same string
					const startDateMatches = screen.getAllByText(formatDate(start_date))
					expect(startDateMatches.length).toBeGreaterThanOrEqual(1)

					// PROPERTY ASSERTION: End date should be formatted
					const endDateMatches = screen.getAllByText(formatDate(end_date))
					expect(endDateMatches.length).toBeGreaterThanOrEqual(1)

					cleanup()
				}
			),
			{ numRuns: 20 }
		)
	})

	/**
	 * Property 9d: For any pets_allowed=true, pet badge and deposit/rent should be shown.
	 * For pets_allowed=false, "Not Allowed" badge should be shown.
	 */
	it('should display pets information based on pets_allowed flag', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					pets_allowed: fc.boolean(),
					pet_deposit: fc.option(fc.integer({ min: 10000, max: 100000 })),
					pet_rent: fc.option(fc.integer({ min: 1000, max: 10000 }))
				}),
				async ({ pets_allowed, pet_deposit, pet_rent }) => {
					const data: Partial<LeaseWizardData> = {
						pets_allowed,
						pet_deposit: pets_allowed ? (pet_deposit ?? undefined) : undefined,
						pet_rent: pets_allowed ? (pet_rent ?? undefined) : undefined,
						governing_state: 'TX'
					}

					render(<ReviewStep data={data} />)

					if (pets_allowed) {
						// PROPERTY ASSERTION: "Allowed" badge should appear
						expect(screen.getByText('Allowed')).toBeInTheDocument()
						expect(screen.queryByText('Not Allowed')).not.toBeInTheDocument()
					} else {
						// PROPERTY ASSERTION: "Not Allowed" badge should appear
						expect(screen.getByText('Not Allowed')).toBeInTheDocument()
						expect(screen.queryByText('Allowed')).not.toBeInTheDocument()
					}

					cleanup()
				}
			),
			{ numRuns: 20 }
		)
	})

	/**
	 * Property 9e: For any utilities_included array, all utilities should be displayed as badges.
	 * Note: Uses non-overlapping sets to avoid duplicate element issues in testing.
	 */
	it('should display all utilities as badges', async () => {
		// Test included utilities
		const includedCases = [
			['water', 'electricity'],
			['gas', 'trash', 'internet'],
			['water']
		] as const

		for (const utilities_included of includedCases) {
			const data: Partial<LeaseWizardData> = {
				utilities_included: [...utilities_included],
				tenant_responsible_utilities: [],
				governing_state: 'TX'
			}

			render(<ReviewStep data={data} />)

			// PROPERTY ASSERTION: All included utilities should be displayed
			for (const utility of utilities_included) {
				const displayName = utility.replace('_', ' ')
				expect(screen.getByText(displayName)).toBeInTheDocument()
			}

			cleanup()
		}

		// Test tenant-responsible utilities
		const tenantCases = [
			['water', 'gas'],
			['electricity', 'internet', 'trash']
		] as const

		for (const tenant_responsible_utilities of tenantCases) {
			const data: Partial<LeaseWizardData> = {
				utilities_included: [],
				tenant_responsible_utilities: [...tenant_responsible_utilities],
				governing_state: 'TX'
			}

			render(<ReviewStep data={data} />)

			// PROPERTY ASSERTION: All tenant-responsible utilities should be displayed
			for (const utility of tenant_responsible_utilities) {
				const displayName = utility.replace('_', ' ')
				expect(screen.getByText(displayName)).toBeInTheDocument()
			}

			cleanup()
		}
	})

	/**
	 * Property 9f: For any property_built_before_1978=true, lead paint disclosure section
	 * must be visible with correct acknowledgment status.
	 */
	it('should display lead paint disclosure when property built before 1978', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					property_built_before_1978: fc.constant(true),
					lead_paint_disclosure_acknowledged: fc.boolean()
				}),
				async ({ lead_paint_disclosure_acknowledged }) => {
					const data: Partial<LeaseWizardData> = {
						property_built_before_1978: true,
						lead_paint_disclosure_acknowledged,
						governing_state: 'TX'
					}

					render(<ReviewStep data={data} />)

					// PROPERTY ASSERTION: Lead Paint Disclosure section should be visible
					expect(screen.getByText('Lead Paint Disclosure')).toBeInTheDocument()

					if (lead_paint_disclosure_acknowledged) {
						// PROPERTY ASSERTION: Acknowledged badge should appear
						expect(
							screen.getByText('Disclosure Acknowledged')
						).toBeInTheDocument()
					} else {
						// PROPERTY ASSERTION: Required badge should appear
						expect(
							screen.getByText('Acknowledgment Required')
						).toBeInTheDocument()
					}

					cleanup()
				}
			),
			{ numRuns: 10 }
		)
	})

	/**
	 * Property 9g: For property_built_before_1978=false, lead paint section should NOT appear.
	 */
	it('should NOT display lead paint disclosure when property built after 1978', async () => {
		const data: Partial<LeaseWizardData> = {
			property_built_before_1978: false,
			governing_state: 'TX'
		}

		render(<ReviewStep data={data} />)

		// PROPERTY ASSERTION: Lead Paint section should not be visible
		expect(screen.queryByText('Lead Paint Disclosure')).not.toBeInTheDocument()
	})

	/**
	 * Property 9h: For any property_rules text, it should be displayed in full.
	 */
	it('should display property rules when provided', async () => {
		// Use well-formed rule strings that won't conflict with other UI text
		const ruleCases = [
			'No smoking inside the property at any time.',
			'Quiet hours are from 10 PM to 8 AM daily.',
			'Tenants must maintain renter insurance coverage.',
			'No unauthorized modifications to the unit allowed.',
			'Trash must be disposed of in designated areas only.'
		]

		for (const propertyRules of ruleCases) {
			const data: Partial<LeaseWizardData> = {
				property_rules: propertyRules,
				governing_state: 'TX'
			}

			render(<ReviewStep data={data} />)

			// PROPERTY ASSERTION: Property Rules section should be visible
			expect(screen.getByText('Property Rules')).toBeInTheDocument()

			// PROPERTY ASSERTION: Rules text should be displayed
			expect(screen.getByText(propertyRules)).toBeInTheDocument()

			cleanup()
		}
	})

	/**
	 * Property 9i: For payment_day, correct ordinal suffix should be displayed.
	 */
	it('should display payment day with correct ordinal suffix', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 28 }), async paymentDay => {
				const data: Partial<LeaseWizardData> = {
					payment_day: paymentDay,
					governing_state: 'TX'
				}

				render(<ReviewStep data={data} />)

				// Calculate expected ordinal suffix
				const getOrdinalSuffix = (n: number): string => {
					const s = ['th', 'st', 'nd', 'rd'] as const
					const v = n % 100
					return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th'
				}

				const expectedText = `${paymentDay}${getOrdinalSuffix(paymentDay)} of month`

				// PROPERTY ASSERTION: Payment day should have correct ordinal suffix
				expect(screen.getByText(expectedText)).toBeInTheDocument()

				cleanup()
			}),
			{ numRuns: 28 } // Test all valid payment days
		)
	})

	/**
	 * Property 9j: Governing state should always be displayed (defaults to TX).
	 */
	it('should display governing state', async () => {
		const states = ['TX', 'CA', 'NY', 'FL', 'WA', 'CO', 'AZ', 'NV'] as const

		await fc.assert(
			fc.asyncProperty(fc.constantFrom(...states), async governingState => {
				const data: Partial<LeaseWizardData> = {
					governing_state: governingState
				}

				render(<ReviewStep data={data} />)

				// PROPERTY ASSERTION: Governing state should be displayed
				expect(screen.getByText(governingState)).toBeInTheDocument()

				cleanup()
			}),
			{ numRuns: 8 }
		)
	})
})
