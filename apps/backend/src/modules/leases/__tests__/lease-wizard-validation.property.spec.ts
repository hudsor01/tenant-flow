/**
 * Property-Based Tests for Lease Wizard Validation Schemas
 *
 * Feature: lease-creation-wizard
 * Tests validation logic for the unified lease creation wizard.
 *
 * Properties tested:
 * - Property 5: Start date validation
 * - Property 6: End date validation
 * - Property 7: Rent amount validation
 * - Property 8: Lead paint disclosure requirement
 */

import * as fc from 'fast-check'
import { ZodError } from 'zod'
import {
	selectionStepSchema,
	termsStepSchema,
	leaseDetailsStepSchema,
	leaseWizardSchema,
	validateStartDateNotInPast
} from '@repo/shared/validation/lease-wizard.schemas'

describe('Lease Wizard Validation - Property Tests', () => {
	// Helper to safely parse and return result
	const safeParse = <T>(
		schema: {
			safeParse: (data: unknown) => {
				success: boolean
				data?: T
				error?: ZodError
			}
		},
		data: unknown
	) => {
		return schema.safeParse(data)
	}

	// Generate valid UUID
	const validUuid = fc.uuid()

	// Generate valid date string (YYYY-MM-DD) using integer-based approach
	const validDateString = fc
		.integer({ min: 0, max: 3650 })
		.map(daysFromBase => {
			const baseDate = new Date('2024-01-01')
			baseDate.setDate(baseDate.getDate() + daysFromBase)
			return baseDate.toISOString().split('T')[0]
		})

	// Generate future date string (from today onwards)
	const futureDateString = fc
		.integer({ min: 0, max: 1825 })
		.map(daysFromNow => {
			const date = new Date()
			date.setDate(date.getDate() + daysFromNow)
			return date.toISOString().split('T')[0]
		})

	describe('Selection Step Schema', () => {
		it('should accept valid selection data', async () => {
			await fc.assert(
				fc.asyncProperty(
					validUuid,
					validUuid,
					validUuid,
					async (propertyId, unitId, tenantId) => {
						const result = safeParse(selectionStepSchema, {
							property_id: propertyId,
							unit_id: unitId,
							primary_tenant_id: tenantId
						})

						expect(result.success).toBe(true)
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should reject invalid UUIDs', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.oneof(
						fc.constant(''),
						fc.constant('not-a-uuid'),
						fc.constant('12345'),
						fc.string({ minLength: 1, maxLength: 30 })
					),
					validUuid,
					validUuid,
					async (invalidUuid, unitId, tenantId) => {
						const result = safeParse(selectionStepSchema, {
							property_id: invalidUuid,
							unit_id: unitId,
							primary_tenant_id: tenantId
						})

						expect(result.success).toBe(false)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 5: Start date validation', () => {
		/**
		 * Property 5: Start date validation
		 * For any start date entered, validation passes if and only if
		 * the date is today or in the future.
		 * Validates: Requirements 3.2
		 */

		it('should accept dates today or in the future', () => {
			// Get today's date in YYYY-MM-DD format
			const today = new Date()
			today.setUTCHours(0, 0, 0, 0)
			const todayStr = today.toISOString().split('T')[0] as string

			// Today should be valid
			expect(validateStartDateNotInPast(todayStr)).toBe(true)

			// Tomorrow should be valid
			const tomorrow = new Date(today)
			tomorrow.setDate(tomorrow.getDate() + 1)
			const tomorrowStr = tomorrow.toISOString().split('T')[0] as string
			expect(validateStartDateNotInPast(tomorrowStr)).toBe(true)
		})

		it('should reject dates in the past', () => {
			// Yesterday should be invalid
			const yesterday = new Date()
			yesterday.setDate(yesterday.getDate() - 1)
			const yesterdayStr = yesterday.toISOString().split('T')[0] as string
			expect(validateStartDateNotInPast(yesterdayStr)).toBe(false)
		})

		it('should correctly validate arbitrary future dates', async () => {
			await fc.assert(
				fc.asyncProperty(futureDateString, async (dateStr: string) => {
					expect(validateStartDateNotInPast(dateStr)).toBe(true)
				}),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 6: End date validation', () => {
		/**
		 * Property 6: End date validation
		 * For any start date and end date combination, validation passes
		 * if and only if end date is strictly after start date.
		 * Validates: Requirements 3.3
		 */

		it('should accept end date after start date', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 0, max: 1825 }), // Days from base for start date
					fc.integer({ min: 1, max: 365 }), // Days to add for end date
					async (startDaysFromBase, daysToAdd) => {
						const baseDate = new Date('2024-01-01')
						const startDate = new Date(baseDate)
						startDate.setDate(startDate.getDate() + startDaysFromBase)
						const startStr = startDate.toISOString().split('T')[0]

						const endDate = new Date(startDate)
						endDate.setDate(endDate.getDate() + daysToAdd)
						const endStr = endDate.toISOString().split('T')[0]

						const result = safeParse(termsStepSchema, {
							start_date: startStr,
							end_date: endStr,
							rent_amount: 100000, // $1000 in cents
							security_deposit: 100000,
							payment_day: 1,
							grace_period_days: 3,
							late_fee_amount: 5000
						})

						expect(result.success).toBe(true)
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should reject end date same as start date', async () => {
			await fc.assert(
				fc.asyncProperty(validDateString, async dateStr => {
					const result = safeParse(termsStepSchema, {
						start_date: dateStr,
						end_date: dateStr, // Same date
						rent_amount: 100000,
						security_deposit: 100000,
						payment_day: 1
					})

					expect(result.success).toBe(false)
					if (!result.success) {
						const errorMessage = JSON.stringify(result.error?.issues)
						expect(errorMessage).toContain('end_date')
					}
				}),
				{ numRuns: 50 }
			)
		})

		it('should reject end date before start date', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 365, max: 1825 }), // Days from base for end date
					fc.integer({ min: 1, max: 364 }), // Days to add to end date for start (making start > end)
					async (endDaysFromBase, daysToAdd) => {
						const baseDate = new Date('2024-01-01')
						const endDate = new Date(baseDate)
						endDate.setDate(endDate.getDate() + endDaysFromBase)
						const endStr = endDate.toISOString().split('T')[0]

						const startDate = new Date(endDate)
						startDate.setDate(startDate.getDate() + daysToAdd) // Start is AFTER end
						const startStr = startDate.toISOString().split('T')[0]

						const result = safeParse(termsStepSchema, {
							start_date: startStr,
							end_date: endStr,
							rent_amount: 100000,
							security_deposit: 100000,
							payment_day: 1
						})

						expect(result.success).toBe(false)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 7: Rent amount validation', () => {
		/**
		 * Property 7: Rent amount validation
		 * For any rent amount entered, validation passes if and only if
		 * the amount is a positive number greater than zero.
		 * Validates: Requirements 3.4
		 */

		it('should accept positive rent amounts', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 1, max: 1000000 }), // 1 cent to $10,000 (RENT_MAXIMUM_VALUE)
					async rentAmount => {
						const result = safeParse(termsStepSchema, {
							start_date: '2025-01-01',
							end_date: '2026-01-01',
							rent_amount: rentAmount,
							security_deposit: 0,
							payment_day: 1
						})

						expect(result.success).toBe(true)
					}
				),
				{ numRuns: 50 }
			)
		})

		it('should reject zero rent amount', () => {
			const result = safeParse(termsStepSchema, {
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 0,
				security_deposit: 0,
				payment_day: 1
			})

			expect(result.success).toBe(false)
		})

		it('should reject negative rent amounts', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: -10000000, max: -1 }),
					async negativeRent => {
						const result = safeParse(termsStepSchema, {
							start_date: '2025-01-01',
							end_date: '2026-01-01',
							rent_amount: negativeRent,
							security_deposit: 0,
							payment_day: 1
						})

						expect(result.success).toBe(false)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Property 8: Lead paint disclosure requirement', () => {
		/**
		 * Property 8: Lead paint disclosure requirement
		 * For any property built before 1978, the wizard must require
		 * lead paint disclosure acknowledgment before allowing submission.
		 * Validates: Requirements 4.3
		 */

		it('should require lead paint acknowledgment for pre-1978 properties', async () => {
			await fc.assert(
				fc.asyncProperty(fc.boolean(), async acknowledged => {
					const result = safeParse(leaseDetailsStepSchema, {
						pets_allowed: false,
						utilities_included: [],
						tenant_responsible_utilities: [],
						property_built_before_1978: true,
						lead_paint_disclosure_acknowledged: acknowledged,
						governing_state: 'TX'
					})

					if (acknowledged) {
						expect(result.success).toBe(true)
					} else {
						expect(result.success).toBe(false)
						if (!result.success) {
							const errorMessage = JSON.stringify(result.error?.issues)
							expect(errorMessage).toContain('lead_paint')
						}
					}
				}),
				{ numRuns: 20 }
			)
		})

		it('should not require lead paint acknowledgment for post-1978 properties', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.option(fc.boolean(), { nil: undefined }),
					async acknowledged => {
						const result = safeParse(leaseDetailsStepSchema, {
							pets_allowed: false,
							utilities_included: [],
							tenant_responsible_utilities: [],
							property_built_before_1978: false,
							lead_paint_disclosure_acknowledged: acknowledged,
							governing_state: 'TX'
						})

						expect(result.success).toBe(true)
					}
				),
				{ numRuns: 20 }
			)
		})

		it('should enforce lead paint in full wizard schema', () => {
			// Pre-1978 without acknowledgment should fail
			const resultFail = safeParse(leaseWizardSchema, {
				property_id: '00000000-0000-1000-8000-000000000001',
				unit_id: '00000000-0000-1000-8000-000000000002',
				primary_tenant_id: '00000000-0000-1000-8000-000000000003',
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 100000,
				security_deposit: 100000,
				payment_day: 1,
				pets_allowed: false,
				utilities_included: [],
				tenant_responsible_utilities: [],
				property_built_before_1978: true,
				lead_paint_disclosure_acknowledged: false,
				governing_state: 'TX'
			})

			expect(resultFail.success).toBe(false)

			// Pre-1978 with acknowledgment should pass
			const resultPass = safeParse(leaseWizardSchema, {
				property_id: '00000000-0000-1000-8000-000000000001',
				unit_id: '00000000-0000-1000-8000-000000000002',
				primary_tenant_id: '00000000-0000-1000-8000-000000000003',
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 100000,
				security_deposit: 100000,
				payment_day: 1,
				pets_allowed: false,
				utilities_included: [],
				tenant_responsible_utilities: [],
				property_built_before_1978: true,
				lead_paint_disclosure_acknowledged: true,
				governing_state: 'TX'
			})

			expect(resultPass.success).toBe(true)
		})
	})

	describe('Payment day validation', () => {
		it('should accept payment days 1-31', async () => {
			await fc.assert(
				fc.asyncProperty(fc.integer({ min: 1, max: 31 }), async paymentDay => {
					const result = safeParse(termsStepSchema, {
						start_date: '2025-01-01',
						end_date: '2026-01-01',
						rent_amount: 100000,
						security_deposit: 0,
						payment_day: paymentDay
					})

					expect(result.success).toBe(true)
				}),
				{ numRuns: 31 }
			)
		})

		it('should reject payment days outside 1-31', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.oneof(
						fc.integer({ min: -100, max: 0 }),
						fc.integer({ min: 32, max: 100 })
					),
					async invalidDay => {
						const result = safeParse(termsStepSchema, {
							start_date: '2025-01-01',
							end_date: '2026-01-01',
							rent_amount: 100000,
							security_deposit: 0,
							payment_day: invalidDay
						})

						expect(result.success).toBe(false)
					}
				),
				{ numRuns: 50 }
			)
		})
	})

	describe('Full wizard schema validation', () => {
		it('should accept complete valid wizard data', async () => {
			await fc.assert(
				fc.asyncProperty(
					validUuid,
					validUuid,
					validUuid,
					fc.integer({ min: 50000, max: 500000 }), // $500 - $5000
					fc.integer({ min: 1, max: 31 }),
					async (propertyId, unitId, tenantId, rentAmount, paymentDay) => {
						const result = safeParse(leaseWizardSchema, {
							property_id: propertyId,
							unit_id: unitId,
							primary_tenant_id: tenantId,
							start_date: '2025-06-01',
							end_date: '2026-06-01',
							rent_amount: rentAmount,
							security_deposit: rentAmount,
							payment_day: paymentDay,
							grace_period_days: 3,
							late_fee_amount: 5000,
							pets_allowed: false,
							utilities_included: [],
							tenant_responsible_utilities: [],
							property_built_before_1978: false,
							governing_state: 'TX'
						})

						expect(result.success).toBe(true)
					}
				),
				{ numRuns: 50 }
			)
		})
	})
})
