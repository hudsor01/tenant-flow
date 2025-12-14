/**
 * Property 10: Draft Lease Creation
 * Feature: lease-creation-wizard, Property 10: Draft lease creation
 * Validates: Requirements 5.3
 *
 * For any valid lease creation input, a draft lease must be created with:
 * - status 'draft' (default when not specified)
 * - all provided fields correctly persisted
 * - lease detail fields (wizard flow) correctly mapped
 */

import * as fc from 'fast-check'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { LeasesService } from '../leases.service'
import { SupabaseService } from '../../../database/supabase.service'
import { SilentLogger } from '../../../__test__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'
import type { CreateLeaseDto } from '../dto/create-lease.dto'

describe('Property 10: Draft Lease Creation', () => {
	let service: LeasesService
	let mockSupabaseService: jest.Mocked<Partial<SupabaseService>>

	// Track what data was inserted
	let capturedInsertData: Record<string, unknown> | null = null

	// Helper to create a flexible Supabase query chain
	const createMockChain = (
		resolveData: unknown = null,
		resolveError: unknown = null
	) => {
		const chain: Record<string, jest.Mock> = {}
		const methods = [
			'select',
			'update',
			'delete',
			'eq',
			'neq',
			'is',
			'in',
			'or',
			'gte',
			'lte',
			'order',
			'maybeSingle',
			'not'
		]

		methods.forEach(method => {
			chain[method] = jest.fn(() => chain)
		})

		chain.insert = jest.fn((data: Record<string, unknown>) => {
			capturedInsertData = data
			return chain
		})

		chain.single = jest.fn(() =>
			Promise.resolve({
				data: resolveData,
				error: resolveError
			})
		)

		return chain
	}

	beforeEach(async () => {
		capturedInsertData = null

		mockSupabaseService = {
			getUserClient: jest.fn(() => ({
				from: jest.fn(() => createMockChain())
			})) as unknown as jest.MockedFunction<
				() => ReturnType<SupabaseService['getUserClient']>
			>
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeasesService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<LeasesService>(LeasesService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	/**
	 * Property 10a: For any valid lease DTO, the lease must be created with status 'draft'
	 * when no status is explicitly provided.
	 */
	it.skip('should create lease with draft status by default', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().split('T')[0]!),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2027-12-31') }).map(d => d.toISOString().split('T')[0]!),
					rent_amount: fc.integer({ min: 50000, max: 1000000 }), // $500 - $10,000 in cents
					security_deposit: fc.integer({ min: 0, max: 1000000 }),
					payment_day: fc.integer({ min: 1, max: 28 })
				}),
				async (leaseData) => {
					capturedInsertData = null

					const generatedLeaseId = fc.sample(fc.uuid(), 1)[0]!

					// Setup mock to return unit and tenant found, then lease created
					mockSupabaseService.getUserClient = jest.fn(() => ({
						from: jest.fn((table: string) => {
							if (table === 'units') {
								return createMockChain({
									id: leaseData.unit_id,
									property_id: 'test-property-id'
								})
							}
							if (table === 'tenants') {
								return createMockChain({ id: leaseData.primary_tenant_id })
							}
							if (table === 'leases') {
								const chain = createMockChain({
									id: generatedLeaseId,
									...leaseData,
									lease_status: 'draft'
								})
								return chain
							}
							return createMockChain()
						})
					})) as unknown as jest.MockedFunction<
						() => ReturnType<SupabaseService['getUserClient']>
					>

					const dto: CreateLeaseDto = {
						...leaseData
						// Note: no lease_status provided - should default to 'draft'
					}

					await service.create('test-token', dto)

					// PROPERTY ASSERTION: lease_status must be 'draft' when not provided
					expect(capturedInsertData).not.toBeNull()
					expect(capturedInsertData?.lease_status).toBe('draft')
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 10b: For any lease DTO with wizard detail fields,
	 * all fields must be correctly persisted.
	 */
	it.skip('should persist all lease detail fields from wizard flow', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					// Required fields
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					start_date: fc.date({ noInvalidDate: true, min: new Date('2024-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString().split('T')[0]!),
					end_date: fc.date({ noInvalidDate: true, min: new Date('2025-01-01'), max: new Date('2027-12-31') }).map(d => d.toISOString().split('T')[0]!),
					rent_amount: fc.integer({ min: 50000, max: 1000000 }),
					security_deposit: fc.integer({ min: 0, max: 1000000 }),
					payment_day: fc.integer({ min: 1, max: 28 }),
					// Wizard detail fields
					max_occupants: fc.option(fc.integer({ min: 1, max: 10 })),
					pets_allowed: fc.boolean(),
					pet_deposit: fc.option(fc.integer({ min: 0, max: 100000 })),
					pet_rent: fc.option(fc.integer({ min: 0, max: 50000 })),
					utilities_included: fc.array(
						fc.constantFrom('water', 'electricity', 'gas', 'trash', 'internet'),
						{ minLength: 0, maxLength: 5 }
					),
					tenant_responsible_utilities: fc.array(
						fc.constantFrom('water', 'electricity', 'gas', 'trash', 'internet'),
						{ minLength: 0, maxLength: 5 }
					),
					property_rules: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
					property_built_before_1978: fc.boolean(),
					lead_paint_disclosure_acknowledged: fc.option(fc.boolean()),
					governing_state: fc.constantFrom('TX', 'CA', 'NY', 'FL', 'WA')
				}),
				async (leaseData) => {
					capturedInsertData = null

					const generatedLeaseId = fc.sample(fc.uuid(), 1)[0]!

					mockSupabaseService.getUserClient = jest.fn(() => ({
						from: jest.fn((table: string) => {
							if (table === 'units') {
								return createMockChain({
									id: leaseData.unit_id,
									property_id: 'test-property-id'
								})
							}
							if (table === 'tenants') {
								return createMockChain({ id: leaseData.primary_tenant_id })
							}
							if (table === 'leases') {
								return createMockChain({
									id: generatedLeaseId,
									...leaseData,
									lease_status: 'draft'
								})
							}
							return createMockChain()
						})
					})) as unknown as jest.MockedFunction<
						() => ReturnType<SupabaseService['getUserClient']>
					>

					const dto = leaseData as unknown as CreateLeaseDto

					await service.create('test-token', dto)

					// PROPERTY ASSERTIONS: All wizard detail fields must be persisted
					expect(capturedInsertData).not.toBeNull()

					// Core fields
					expect(capturedInsertData?.unit_id).toBe(leaseData.unit_id)
					expect(capturedInsertData?.primary_tenant_id).toBe(leaseData.primary_tenant_id)
					expect(capturedInsertData?.start_date).toBe(leaseData.start_date)
					expect(capturedInsertData?.rent_amount).toBe(leaseData.rent_amount)

					// Wizard detail fields (only check if provided)
					if (leaseData.max_occupants !== null) {
						expect(capturedInsertData?.max_occupants).toBe(leaseData.max_occupants)
					}
					if (leaseData.pets_allowed !== undefined) {
						expect(capturedInsertData?.pets_allowed).toBe(leaseData.pets_allowed)
					}
					if (leaseData.pet_deposit !== null) {
						expect(capturedInsertData?.pet_deposit).toBe(leaseData.pet_deposit)
					}
					if (leaseData.pet_rent !== null) {
						expect(capturedInsertData?.pet_rent).toBe(leaseData.pet_rent)
					}
					if (leaseData.utilities_included?.length) {
						expect(capturedInsertData?.utilities_included).toEqual(leaseData.utilities_included)
					}
					if (leaseData.tenant_responsible_utilities?.length) {
						expect(capturedInsertData?.tenant_responsible_utilities).toEqual(leaseData.tenant_responsible_utilities)
					}
					if (leaseData.property_rules !== null) {
						expect(capturedInsertData?.property_rules).toBe(leaseData.property_rules)
					}
					if (leaseData.property_built_before_1978 !== undefined) {
						expect(capturedInsertData?.property_built_before_1978).toBe(leaseData.property_built_before_1978)
					}
					if (leaseData.lead_paint_disclosure_acknowledged !== null) {
						expect(capturedInsertData?.lead_paint_disclosure_acknowledged).toBe(leaseData.lead_paint_disclosure_acknowledged)
					}
					if (leaseData.governing_state) {
						expect(capturedInsertData?.governing_state).toBe(leaseData.governing_state)
					}
				}
			),
			{ numRuns: 25 }
		)
	})

	/**
	 * Property 10c: Financial fields must be correctly persisted with exact values.
	 */
	it.skip('should preserve exact financial amounts without modification', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					unit_id: fc.uuid(),
					primary_tenant_id: fc.uuid(),
					start_date: fc.constant('2025-01-01'),
					end_date: fc.constant('2026-01-01'),
					// Financial fields with edge cases
					rent_amount: fc.integer({ min: 1, max: 99999999 }), // Up to $999,999.99
					security_deposit: fc.integer({ min: 0, max: 99999999 }),
					late_fee_amount: fc.option(fc.integer({ min: 0, max: 10000000 })),
					pet_deposit: fc.option(fc.integer({ min: 0, max: 10000000 })),
					pet_rent: fc.option(fc.integer({ min: 0, max: 1000000 })),
					payment_day: fc.integer({ min: 1, max: 28 })
				}),
				async (leaseData) => {
					capturedInsertData = null

					mockSupabaseService.getUserClient = jest.fn(() => ({
						from: jest.fn((table: string) => {
							if (table === 'units') {
								return createMockChain({
									id: leaseData.unit_id,
									property_id: 'test-property-id'
								})
							}
							if (table === 'tenants') {
								return createMockChain({ id: leaseData.primary_tenant_id })
							}
							if (table === 'leases') {
								return createMockChain({
									id: 'generated-lease-id',
									...leaseData,
									lease_status: 'draft'
								})
							}
							return createMockChain()
						})
					})) as unknown as jest.MockedFunction<
						() => ReturnType<SupabaseService['getUserClient']>
					>

					const dto = leaseData as unknown as CreateLeaseDto

					await service.create('test-token', dto)

					// PROPERTY ASSERTIONS: Financial values must be exact (no rounding, no modification)
					expect(capturedInsertData).not.toBeNull()
					expect(capturedInsertData?.rent_amount).toBe(leaseData.rent_amount)
					expect(capturedInsertData?.security_deposit).toBe(leaseData.security_deposit)

					if (leaseData.late_fee_amount !== null) {
						expect(capturedInsertData?.late_fee_amount).toBe(leaseData.late_fee_amount)
					}
					if (leaseData.pet_deposit !== null) {
						expect(capturedInsertData?.pet_deposit).toBe(leaseData.pet_deposit)
					}
					if (leaseData.pet_rent !== null) {
						expect(capturedInsertData?.pet_rent).toBe(leaseData.pet_rent)
					}
				}
			),
			{ numRuns: 30 }
		)
	})
})
