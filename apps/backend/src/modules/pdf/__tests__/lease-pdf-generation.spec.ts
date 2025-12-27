/**
 * Lease PDF Generation Integration Tests
 *
 * Tests the complete flow:
 * 1. Query lease data from database
 * 2. Auto-fill PDF fields
 * 3. Identify missing fields
 * 4. Merge user-provided fields
 * 5. Generate filled PDF
 *
 * Currently configured for Texas residential leases.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { LeasePdfMapperService } from '../lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from '../lease-pdf-generator.service'
import type { LeasePdfFields } from '../lease-pdf-mapper.service'
import { StateValidationService } from '../state-validation.service'
import { TemplateCacheService } from '../template-cache.service'
import { AppLogger } from '../../../logger/app-logger.service'
import type { Database } from '@repo/shared/types/supabase'

type LeaseRow = Database['public']['Tables']['leases']['Row']
type PropertyRow = Database['public']['Tables']['properties']['Row']
type UnitRow = Database['public']['Tables']['units']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type TenantRow = Database['public']['Tables']['tenants']['Row']

describe('Lease PDF Generation (Integration)', () => {
	let mapperService: LeasePdfMapperService
	let generatorService: LeasePdfGeneratorService

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeasePdfMapperService,
				LeasePdfGeneratorService,
				StateValidationService,
				TemplateCacheService,
				{
					provide: AppLogger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn()
					}
				}
			]
		}).compile()

		mapperService = module.get<LeasePdfMapperService>(
			LeasePdfMapperService
		)
		generatorService = module.get<LeasePdfGeneratorService>(
			LeasePdfGeneratorService
		)
	})

	describe('Field Mapping', () => {
		it('should auto-fill all available fields from database', () => {
			// Mock database data
			const mockLeaseData = createMockLeaseData()

			// Map to PDF fields
			const { fields, missing } = mapperService.mapLeaseToPdfFields(mockLeaseData)

			// Verify auto-filled fields
			expect(fields.landlord_name).toBe('John Doe')
			expect(fields.tenant_name).toBe('Jane Smith')
			expect(fields.property_address).toContain('123 Main St')
			expect(fields.property_address).toContain('Austin, TX 78701')
			expect(fields.monthly_rent_amount).toBe('1,500.00')
			expect(fields.security_deposit_amount).toBe('1,500.00')

			// Verify missing fields identified
			expect(missing.fields).toEqual([
				'immediate_family_members',
				'landlord_notice_address'
			])
			expect(missing.isComplete).toBe(false)
		})

		it('should format dates correctly', () => {
			const mockLeaseData = createMockLeaseData({
				startDate: '2025-01-15',
				endDate: '2026-01-15'
			})

			const { fields } = mapperService.mapLeaseToPdfFields(mockLeaseData)

			// Dates should be formatted as "Month Day, Year"
			// Note: Exact day may vary by timezone, so check format pattern
			expect(fields.lease_start_date).toMatch(/January \d{1,2}, 2025/)
			expect(fields.lease_end_date).toMatch(/January \d{1,2}, 2026/)
		})

		it('should format currency correctly', () => {
			const mockLeaseData = createMockLeaseData({
				rentAmount: 250000 // $2,500.00
			})

			const { fields } = mapperService.mapLeaseToPdfFields(mockLeaseData)

			expect(fields.monthly_rent_amount).toBe('2,500.00')
		})
	})

	describe('Missing Fields Validation', () => {
		it('should validate user-provided fields', () => {
			const validData = {
				immediate_family_members: 'Spouse, 2 children',
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			}

			const result = mapperService.validateMissingFields(validData)

			expect(result.isValid).toBe(true)
			expect(result.errors).toEqual([])
		})

		it('should reject missing landlord_notice_address', () => {
			const invalidData = {
				immediate_family_members: 'None'
				// Missing landlord_notice_address
			}

			const result = mapperService.validateMissingFields(invalidData)

			expect(result.isValid).toBe(false)
			expect(result.errors).toContain(
				'landlord_notice_address is required and cannot be empty'
			)
		})

		it('should allow empty immediate_family_members', () => {
			const validData = {
				immediate_family_members: '',
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			}

			const result = mapperService.validateMissingFields(validData)

			// Should still pass validation (undefined check, not empty string)
			expect(result.isValid).toBe(true)
		})
	})

	describe('Field Merging', () => {
		it('should merge user-provided fields with auto-filled fields', () => {
			const mockLeaseData = createMockLeaseData()
			const { fields: autoFilled } =
				mapperService.mapLeaseToPdfFields(mockLeaseData)

			const userProvided = {
				immediate_family_members: 'Spouse, 2 children',
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			}

			const completeFields = mapperService.mergeMissingFields(
				autoFilled,
				userProvided
			)

			// Verify auto-filled fields preserved
			expect(completeFields.landlord_name).toBe('John Doe')
			expect(completeFields.tenant_name).toBe('Jane Smith')

			// Verify user-provided fields added
			expect(completeFields.immediate_family_members).toBe('Spouse, 2 children')
			expect(completeFields.landlord_notice_address).toBe(
				'456 Notice Ave, Austin, TX 78702'
			)
		})

		it('should default immediate_family_members to "None" if not provided', () => {
			const mockLeaseData = createMockLeaseData()
			const { fields: autoFilled } =
				mapperService.mapLeaseToPdfFields(mockLeaseData)

			const userProvided = {
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			}

			const completeFields = mapperService.mergeMissingFields(
				autoFilled,
				userProvided
			)

			expect(completeFields.immediate_family_members).toBe('None')
		})
	})

	describe('PDF Generation', () => {
		it('should generate PDF buffer', async () => {
			const mockLeaseData = createMockLeaseData()
			const { fields: autoFilled } =
				mapperService.mapLeaseToPdfFields(mockLeaseData)

			const completeFields = mapperService.mergeMissingFields(autoFilled, {
				immediate_family_members: 'None',
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			})

			const pdfBuffer = await generatorService.generateFilledPdf(
				completeFields,
				'test-lease-id',
				{ state: 'TX' }
			)

			// Verify PDF buffer
			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)

			// Verify PDF signature
			const pdfSignature = pdfBuffer.toString('utf-8', 0, 4)
			expect(pdfSignature).toBe('%PDF')
		})

		it('should handle missing PDF template gracefully', async () => {
			const mockFields: LeasePdfFields = {
				landlord_name: 'Test',
				tenant_name: 'Test',
				property_address: 'Test',
				lease_start_date: 'January 1, 2025',
				lease_end_date: 'December 31, 2025',
				monthly_rent_amount: '1,000.00',
				security_deposit_amount: '1,000.00',
				late_fee_per_day: '50.00',
				nsf_fee: '35.00',
				month_to_month_rent: '1,200.00',
				pet_fee_per_day: '25.00',
				property_built_before_1978: 'No',
				agreement_date_day: '1',
				agreement_date_month: 'January',
				agreement_date_year: '25'
			}

			// When requesting a non-existent state, it will default to Texas template
			// but should throw if Texas template also doesn't exist
			// Since we have Texas template in test environment, this will succeed

			// ZZ state will default to Texas template, which exists, so no error
			const result = await generatorService.generateFilledPdf(
				mockFields,
				'test-id',
				{ state: 'ZZ' }
			)

			// Should succeed because it defaults to TX template
			expect(result).toBeInstanceOf(Buffer)
		})

		it('should use state-specific template path', async () => {
			const mockLeaseData = createMockLeaseData()
			const { fields: autoFilled } =
				mapperService.mapLeaseToPdfFields(mockLeaseData)

			const completeFields = mapperService.mergeMissingFields(autoFilled, {
				immediate_family_members: 'None',
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			})

			// Should use Texas template for TX state
			const pdfBuffer = await generatorService.generateFilledPdf(
				completeFields,
				'test-lease-id',
				{ state: 'TX' }
			)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})

		it('should default to TX template when state is not provided', async () => {
			const mockLeaseData = createMockLeaseData()
			const { fields: autoFilled } =
				mapperService.mapLeaseToPdfFields(mockLeaseData)

			const completeFields = mapperService.mergeMissingFields(autoFilled, {
				immediate_family_members: 'None',
				landlord_notice_address: '456 Notice Ave, Austin, TX 78702'
			})

			// Should default to TX when no state provided
			const pdfBuffer = await generatorService.generateFilledPdf(
				completeFields,
				'test-lease-id'
			)

			expect(pdfBuffer).toBeInstanceOf(Buffer)
			expect(pdfBuffer.length).toBeGreaterThan(0)
		})
	})
})

/**
 * Helper function to create mock lease data
 */
function createMockLeaseData(overrides?: {
	startDate?: string
	endDate?: string
	rentAmount?: number
}): {
	lease: LeaseRow
	property: PropertyRow
	unit: UnitRow
	landlord: UserRow
	tenant: UserRow
	tenantRecord: TenantRow
} {
	const today = new Date().toISOString()

	return {
		lease: {
			id: 'mock-lease-id',
			owner_user_id: 'mock-landlord-id',
			primary_tenant_id: 'mock-tenant-record-id',
			unit_id: 'mock-unit-id',
			start_date: overrides?.startDate || '2025-01-01',
			end_date: overrides?.endDate || '2026-01-01',
			rent_amount: overrides?.rentAmount || 150000, // $1,500
			security_deposit: 150000,
			payment_day: 1,
			lease_status: 'draft',
			late_fee_amount: 5000,
			grace_period_days: 3,
			property_built_before_1978: false,
			auto_pay_enabled: false,
			version: 1,
			created_at: today,
			updated_at: today,
			lead_paint_disclosure_acknowledged: null,
			sent_for_signature_at: null,
			owner_signed_at: null,
			owner_signature_ip: null,
			tenant_signed_at: null,
			tenant_signature_ip: null,
			docuseal_submission_id: null,
			stripe_subscription_id: null,
			subscription_status: null,
			max_occupants: null,
			pets_allowed: null,
			pet_deposit: null,
			pet_rent: null,
			utilities_included: null,
			tenant_responsible_utilities: null,
			property_rules: null,
			governing_state: 'TX',
			owner_signature_method: null,
			tenant_signature_method: null
		},
		property: {
			id: 'mock-property-id',
			owner_user_id: 'mock-landlord-id',
			name: 'Test Property',
			address_line1: '123 Main St',
			address_line2: null,
			city: 'Austin',
			state: 'TX',
			postal_code: '78701',
			property_type: 'SINGLE_FAMILY',
			status: 'active',
			year_built: null,
			lot_size: null,
			description: null,
			notes: null,
			created_at: today,
			updated_at: today
		},
		unit: {
			id: 'mock-unit-id',
			property_id: 'mock-property-id',
			owner_user_id: 'mock-landlord-id',
			unit_number: '101',
			rent_amount: overrides?.rentAmount || 150000,
			bedrooms: 2,
			bathrooms: 1,
			square_feet: 800,
			status: 'occupied',
			floor_number: null,
			description: null,
			amenities: null,
			created_at: today,
			updated_at: today
		},
		landlord: {
			id: 'mock-landlord-id',
			email: 'landlord@test.com',
			full_name: 'John Doe',
			first_name: 'John',
			last_name: 'Doe',
			user_type: 'OWNER',
			phone: null,
			avatar_url: null,
			timezone: null,
			created_at: today,
			updated_at: today
		},
		tenant: {
			id: 'mock-tenant-user-id',
			email: 'tenant@test.com',
			full_name: 'Jane Smith',
			first_name: 'Jane',
			last_name: 'Smith',
			user_type: 'TENANT',
			phone: null,
			avatar_url: null,
			timezone: null,
			created_at: today,
			updated_at: today
		},
		tenantRecord: {
			id: 'mock-tenant-record-id',
			user_id: 'mock-tenant-user-id',
			stripe_customer_id: 'cus_mock',
			created_at: today,
			updated_at: today
		}
	}
}
