import { Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SupabaseService } from '../../database/supabase.service'
import { BalanceSheetService } from './balance-sheet.service'
import * as ledgerHelpers from './financial-ledger.helpers'

describe('BalanceSheetService', () => {
	let service: BalanceSheetService
	let supabaseService: jest.Mocked<SupabaseService>
	let mockClient: any

	const createEmptyLedger = () => ({
		rentPayments: [],
		expenses: [],
		leases: [],
		maintenanceRequests: [],
		units: [],
		properties: []
	})

	beforeEach(async () => {
		mockClient = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: { id: 'user-123' } },
					error: null
				})
			}
		}

		supabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockClient),
			getUserClient: jest.fn().mockReturnValue(mockClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BalanceSheetService,
				{
					provide: SupabaseService,
					useValue: supabaseService
				}
			]
		}).compile()

		service = module.get(BalanceSheetService)

		jest.spyOn(Logger.prototype, 'log').mockImplementation()
		jest.spyOn(Logger.prototype, 'error').mockImplementation()
		jest.spyOn(Logger.prototype, 'warn').mockImplementation()
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	describe('generateBalanceSheet', () => {
		it('should generate balance sheet with valid data', async () => {
const mockLedgerData = {
			rentPayments: [
				{
					id: 'rent-1',
					lease_id: 'lease-1',
					amount: 18000,
					due_date: '2024-10-01',
					status: 'PAID',
					paid_date: '2024-10-01',
					created_at: '2024-09-01',
					application_fee_amount: 0,
					currency: 'USD',
					late_fee_amount: null,
					payment_method_type: 'card',
					updated_at: '2024-10-01',
					description: null,
					receipt_url: null,
					failure_reason: null,
					period_end: '2024-10-31',
					period_start: '2024-10-01',
					stripe_payment_intent_id: 'pi_123',
					tenant_id: 'tenant-1'
				}
			],
			expenses: [
				{
					id: 'exp-1',
					maintenance_request_id: 'maint-1',
					amount: 30000,
					expense_date: '2024-01-01',
					created_at: '2024-01-01',
					updated_at: '2024-01-01',
					vendor_name: 'ABC Contractors'
				}
			],
			leases: [
					{
						id: 'lease-1',
						unit_id: 'unit-1',
						security_deposit: 0,
						primary_tenant_id: 'tenant-1',
						auto_pay_enabled: null,
						created_at: '2024-01-01',
						end_date: '2025-01-01',
						grace_period_days: null,
						late_fee_amount: null,
						late_fee_days: null,
						monthly_rent: 1500,
						start_date: '2024-01-01',
						updated_at: '2024-01-01',
						lease_status: 'ACTIVE',
						payment_day: 1,
						rent_amount: 1500,
						rent_currency: 'USD',
						stripe_subscription_id: null,
						property_owner_id: 'owner-1'
					}
				],
				maintenanceRequests: [],
				units: [
					{
						id: 'unit-1',
						property_id: 'prop-1',
						bathrooms: 2,
						bedrooms: 3,
						created_at: '2024-01-01',
						rent_amount: 1500,
						rent_currency: 'USD',
						rent_period: 'monthly',
						square_feet: 1200,
						status: 'OCCUPIED',
						unit_number: '101',
						updated_at: '2024-01-01',
						property_owner_id: 'owner-1'
					}
				],
				properties: [
				{
					id: 'prop-1',
					owner_id: 'user-123',
					address_line1: '123 Main St',
					address_line2: null,
					city: 'Anytown',
					country: 'USA',
					created_at: '2024-01-01',
					date_sold: null,
					name: 'Property 1',
					postal_code: '12345',
					property_owner_id: 'user-123',
					property_type: 'residential',
					sale_price: null,
					updated_at: '2024-01-01',
					state: 'CA',
					status: 'ACTIVE'
				}
			]
		}

		jest
			.spyOn(ledgerHelpers, 'loadLedgerData')
			.mockResolvedValue(mockLedgerData)

		const result = await service.generateBalanceSheet(
			'user-123',
			'2024-10-31'
		)

		// Expected: NOI / cap rate (18000 / 0.06 = 300000)
			const expectedPropertyValue = 18000 / 0.06
			expect(result.assets.fixedAssets.propertyValues).toBe(
				expectedPropertyValue
			)

			// Verify depreciation calculation (15% of property value)
			const expectedDepreciation = expectedPropertyValue * 0.15
			expect(result.assets.fixedAssets.accumulatedDepreciation).toBe(
				expectedDepreciation
			)

			// Verify net property value
			const expectedNetValue = expectedPropertyValue - expectedDepreciation
			expect(result.assets.fixedAssets.netPropertyValue).toBe(expectedNetValue)
		})

		it('should validate balance sheet correctly', async () => {
			jest
				.spyOn(ledgerHelpers, 'loadLedgerData')
				.mockResolvedValue(createEmptyLedger())

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Balance sheet should validate correctly
			expect(result.balanceCheck).toBeDefined()
			expect(typeof result.balanceCheck).toBe('boolean')

			// Verify the fundamental accounting equation
			const assetTotal = result.assets.totalAssets
			const liabilitiesTotal = result.liabilities.totalLiabilities
			const equityTotal = result.equity.totalEquity
			const difference = Math.abs(assetTotal - (liabilitiesTotal + equityTotal))

			// Should be balanced (allowing for small rounding errors)
			expect(difference).toBeLessThan(0.01)
		})

		it('should handle security deposits correctly as both asset and liability', async () => {
			const mockLedgerData = {
				rentPayments: [],
				expenses: [],
				leases: [
					{
						id: 'lease-1',
						unit_id: 'unit-1',
						security_deposit: 10000,
						primary_tenant_id: 'tenant-1',
						auto_pay_enabled: null,
						created_at: '2024-01-01',
						end_date: '2025-01-01',
						grace_period_days: null,
						late_fee_amount: null,
						late_fee_days: null,
						monthly_rent: 1500,
						start_date: '2024-01-01',
						updated_at: '2024-01-01',
						lease_status: 'ACTIVE',
						payment_day: 1,
						rent_amount: 1500,
						rent_currency: 'USD',
						stripe_subscription_id: null,
						property_owner_id: 'owner-1'
					},
					{
						id: 'lease-2',
						unit_id: 'unit-2',
						security_deposit: 5000,
						primary_tenant_id: 'tenant-2',
						auto_pay_enabled: null,
						created_at: '2024-01-01',
						end_date: '2025-01-01',
						grace_period_days: null,
						late_fee_amount: null,
						late_fee_days: null,
						monthly_rent: 1500,
						start_date: '2024-01-01',
						updated_at: '2024-01-01',
						lease_status: 'ACTIVE',
						payment_day: 1,
						rent_amount: 1500,
						rent_currency: 'USD',
						stripe_subscription_id: null,
						property_owner_id: 'owner-2'
					}
				],
				maintenanceRequests: [],
				units: [
					{
						id: 'unit-1',
						property_id: 'prop-1',
						bathrooms: 2,
						bedrooms: 3,
						created_at: '2024-01-01',
						rent_amount: 1500,
						rent_currency: 'USD',
						rent_period: 'monthly',
						square_feet: 1200,
						status: 'OCCUPIED',
						unit_number: '101',
						updated_at: '2024-01-01',
						property_owner_id: 'owner-1'
					},
					{
						id: 'unit-2',
						property_id: 'prop-1',
						bathrooms: 2,
						bedrooms: 3,
						created_at: '2024-01-01',
						rent_amount: 1500,
						rent_currency: 'USD',
						rent_period: 'monthly',
						square_feet: 1200,
						status: 'OCCUPIED',
						unit_number: '102',
						updated_at: '2024-01-01',
						property_owner_id: 'owner-1'
					}
				],
				properties: [
					{
						id: 'prop-1',
						owner_id: 'user-123',
						address_line1: '123 Main St',
						address_line2: null,
						city: 'Anytown',
						country: 'USA',
						created_at: '2024-01-01',
						date_sold: null,
						name: 'Property 1',
						postal_code: '12345',
						property_owner_id: 'user-123',
						property_type: 'residential',
						sale_price: null,
						updated_at: '2024-01-01',
						state: 'CA',
						status: 'ACTIVE'
					}
				]
			}

			jest
				.spyOn(ledgerHelpers, 'loadLedgerData')
				.mockResolvedValue(mockLedgerData)

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Security deposits should appear as both asset and liability
			expect(result.assets.currentAssets.security_deposits).toBe(15000)
			expect(
				result.liabilities.currentLiabilities.security_depositLiability
			).toBe(15000)

			// They should offset each other in the balance equation
			expect(result.balanceCheck).toBeDefined()
		})

		it('should format period correctly', async () => {
			jest
				.spyOn(ledgerHelpers, 'loadLedgerData')
				.mockResolvedValue(createEmptyLedger())

			const asOfDate = '2024-10-31'
			const result = await service.generateBalanceSheet('user-123', asOfDate)

			expect(result.period.start_date).toBe(asOfDate)
			expect(result.period.end_date).toBe(asOfDate)
			expect(result.period.label).toContain('2024')
		})

		it('should handle zero NOI correctly', async () => {
			jest
				.spyOn(ledgerHelpers, 'loadLedgerData')
				.mockResolvedValue(createEmptyLedger())

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// With zero NOI, property values should be zero
			expect(result.assets.fixedAssets.propertyValues).toBe(0)
			expect(result.assets.fixedAssets.accumulatedDepreciation).toBe(0)
			expect(result.assets.fixedAssets.netPropertyValue).toBe(0)
			expect(result.assets.fixedAssets.total).toBe(0)
		})

		it('should handle multiple properties with different NOI values', async () => {
			const mockLedgerData = {
				rentPayments: [
					{
						id: 'rent-1',
						lease_id: 'lease-1',
						amount: 1500,
						due_date: '2024-10-01',
						status: 'PAID',
						paid_date: '2024-10-01',
						created_at: '2024-09-01',
						application_fee_amount: 0,
						currency: 'USD',
						late_fee_amount: null,
						payment_method_type: 'card',
						updated_at: '2024-10-01',
						description: null,
						receipt_url: null,
						failure_reason: null,
						period_end: '2024-10-31',
						period_start: '2024-10-01',
						stripe_payment_intent_id: 'pi_789',
						tenant_id: 'tenant-1'
				},
			{
				id: 'rent-2',
				lease_id: 'lease-1',
				amount: 1500,
				due_date: '2024-11-01',
				status: 'PAID',
				paid_date: '2024-11-01',
				created_at: '2024-10-01',
				application_fee_amount: 0,
				currency: 'USD',
				late_fee_amount: null,
				payment_method_type: 'card',
				updated_at: '2024-11-01',
				description: null,
				receipt_url: null,
				failure_reason: null,
				period_end: '2024-11-30',
				period_start: '2024-11-01',
				stripe_payment_intent_id: 'pi_101',
				tenant_id: 'tenant-1'
			},
			{
				id: 'rent-3',
				lease_id: 'lease-3',
				amount: 6000,
				due_date: '2024-10-01',
				status: 'PAID',
				paid_date: '2024-10-01',
				created_at: '2024-09-01',
				application_fee_amount: 0,
				currency: 'USD',
				late_fee_amount: null,
				payment_method_type: 'card',
				updated_at: '2024-10-01',
				description: null,
				receipt_url: null,
				failure_reason: null,
				period_end: '2024-10-31',
				period_start: '2024-10-01',
				stripe_payment_intent_id: 'pi_202',
				tenant_id: 'tenant-3'
			}
				],
				expenses: [],
				leases: [
					{
						id: 'lease-1',
						unit_id: 'unit-1',
						security_deposit: 0,
						primary_tenant_id: 'tenant-1',
						auto_pay_enabled: null,
						created_at: '2024-01-01',
						end_date: '2025-01-01',
						grace_period_days: null,
						late_fee_amount: null,
						late_fee_days: null,
						monthly_rent: 1500,
						start_date: '2024-01-01',
						updated_at: '2024-01-01',
						lease_status: 'ACTIVE',
						payment_day: 1,
						rent_amount: 1500,
						rent_currency: 'USD',
						stripe_subscription_id: null,
						property_owner_id: 'owner-1'
					},
					{
						id: 'lease-2',
						unit_id: 'unit-2',
						security_deposit: 0,
						primary_tenant_id: 'tenant-2',
						auto_pay_enabled: null,
						created_at: '2024-01-01',
						end_date: '2025-01-01',
						grace_period_days: null,
						late_fee_amount: null,
						late_fee_days: null,
						monthly_rent: 1500,
						start_date: '2024-01-01',
						updated_at: '2024-01-01',
						lease_status: 'ACTIVE',
						payment_day: 1,
						rent_amount: 1500,
						rent_currency: 'USD',
						stripe_subscription_id: null,
						property_owner_id: 'owner-2'
					},
					{
						id: 'lease-3',
						unit_id: 'unit-3',
						security_deposit: 0,
						primary_tenant_id: 'tenant-3',
						auto_pay_enabled: null,
						created_at: '2024-01-01',
						end_date: '2025-01-01',
						grace_period_days: null,
						late_fee_amount: null,
						late_fee_days: null,
						monthly_rent: 1500,
						start_date: '2024-01-01',
						updated_at: '2024-01-01',
						lease_status: 'ACTIVE',
						payment_day: 1,
						rent_amount: 1500,
						rent_currency: 'USD',
						stripe_subscription_id: null,
						property_owner_id: 'owner-3'
					}
				],
				maintenanceRequests: [],
				units: [
					{
						id: 'unit-1',
						property_id: 'prop-1',
						bathrooms: 2,
						bedrooms: 3,
						created_at: '2024-01-01',
						rent_amount: 1500,
						rent_currency: 'USD',
						rent_period: 'monthly',
						square_feet: 1200,
						status: 'OCCUPIED',
						unit_number: '101',
						updated_at: '2024-01-01',
						property_owner_id: 'owner-1'
					},
					{
						id: 'unit-2',
						property_id: 'prop-2',
						bathrooms: 2,
						bedrooms: 3,
						created_at: '2024-01-01',
						rent_amount: 1500,
						rent_currency: 'USD',
						rent_period: 'monthly',
						square_feet: 1200,
						status: 'OCCUPIED',
						unit_number: '201',
						updated_at: '2024-01-01',
						property_owner_id: 'owner-2'
					},
					{
						id: 'unit-3',
						property_id: 'prop-3',
						bathrooms: 2,
						bedrooms: 3,
						created_at: '2024-01-01',
						rent_amount: 1500,
						rent_currency: 'USD',
						rent_period: 'monthly',
						square_feet: 1200,
						status: 'OCCUPIED',
						unit_number: '301',
						updated_at: '2024-01-01',
						property_owner_id: 'owner-3'
					}
				],
				properties: [
					{
						id: 'prop-1',
						owner_id: 'user-123',
						address_line1: '123 Main St',
						address_line2: null,
						city: 'Anytown',
						country: 'USA',
						created_at: '2024-01-01',
						date_sold: null,
						name: 'Property 1',
						postal_code: '12345',
						property_owner_id: 'user-123',
						property_type: 'residential',
						sale_price: null,
						updated_at: '2024-01-01',
						state: 'CA',
						status: 'ACTIVE'
					},
					{
						id: 'prop-2',
						owner_id: 'user-123',
						address_line1: '456 Oak St',
						address_line2: null,
						city: 'Anytown',
						country: 'USA',
						created_at: '2024-01-01',
						date_sold: null,
						name: 'Property 2',
						postal_code: '12345',
						property_owner_id: 'user-123',
						property_type: 'residential',
						sale_price: null,
						updated_at: '2024-01-01',
						state: 'CA',
						status: 'ACTIVE'
					},
					{
						id: 'prop-3',
						owner_id: 'user-123',
						address_line1: '789 Pine St',
						address_line2: null,
						city: 'Anytown',
						country: 'USA',
						created_at: '2024-01-01',
						date_sold: null,
						name: 'Property 3',
						postal_code: '12345',
						property_owner_id: 'user-123',
						property_type: 'residential',
						sale_price: null,
						updated_at: '2024-01-01',
						state: 'CA',
						status: 'ACTIVE'
					}
				]
			}

			jest
				.spyOn(ledgerHelpers, 'loadLedgerData')
				.mockResolvedValue(mockLedgerData)

			const result = await service.generateBalanceSheet(
				'user-123',
				'2024-10-31'
			)

			// Total NOI should be sum of all properties (7500 based on actual payments)
			const totalNOI = 7500
			const expectedPropertyValue = totalNOI / 0.06
			expect(result.assets.fixedAssets.propertyValues).toBe(
				expectedPropertyValue
			)
		})
	})
})
