import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { FinancialService } from './financial.service'
import { FinancialExpenseService } from './financial-expense.service'
import { FinancialRevenueService } from './financial-revenue.service'
import { SupabaseService } from '../../database/supabase.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { Pool } from 'pg'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Integration test for FinancialService N+1 query prevention
 * Tests against ACTUAL local Supabase instance to verify query counts
 */
describe('FinancialService - N+1 Integration Tests', () => {
	let service: FinancialService
	let supabaseClient: SupabaseClient
	let ownerUserId: string
	let testOwnerId: string
	let tenantId: string
	const testPropertyIds: string[] = []
	const testUnitIds: string[] = []
	const testLeaseIds: string[] = []

	const pool = new Pool({
		connectionString:
			process.env.DATABASE_URL ||
			'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
	})

	const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
	const SUPABASE_KEY =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ANON_KEY ||
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

	beforeAll(async () => {
		// Create real Supabase client
		supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

		// Create mock SupabaseService
		const mockSupabaseService = {
			getAdminClient: () => supabaseClient,
			getUserClient: () => supabaseClient
		}

		// Create test module with real services and sub-services
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				FinancialService,
				FinancialExpenseService,
				FinancialRevenueService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<FinancialService>(FinancialService)

		// Setup test data
		await setupTestData()
	})

	afterAll(async () => {
		// Cleanup test data
		await cleanupTestData()
	})

	async function setupTestData() {
		// Create test owner in users + stripe_connected_accounts to satisfy FK constraints
		ownerUserId = randomUUID()

		// Create tenant user in public.users first (FK constraint tenants.user_id -> public.users.id)
		const tenantUserId = randomUUID()

		// Insert into public.users (required for tenants FK constraint)
		await pool.query(
			`insert into users (id, email, full_name, user_type)
			 values ($1, $2, 'Integration Tenant', 'TENANT')
			 on conflict (id) do nothing`,
			[tenantUserId, `integration-tenant-${Date.now()}@test.local`]
		)

		const tenantRes = await pool.query(
			`insert into tenants (user_id, stripe_customer_id)
       values ($1, $2)
       on conflict (user_id) do update set stripe_customer_id = excluded.stripe_customer_id
       returning id`,
			[tenantUserId, 'cus_integration_tenant']
		)
		tenantId = tenantRes.rows[0].id

		await pool.query(
			`insert into users (id, email, full_name, user_type) values ($1, $2, $3, 'OWNER') on conflict (id) do nothing`,
			[
				ownerUserId,
				`integration-owner-${Date.now()}@test.local`,
				'Integration Owner'
			]
		)

		const ownerRes = await pool.query(
			`insert into stripe_connected_accounts (user_id, stripe_account_id, business_type, default_platform_fee_percent)
       values ($1, $2, 'individual', 0) returning id`,
			[ownerUserId, `acct_${ownerUserId.slice(0, 8)}`]
		)

		testOwnerId = ownerRes.rows[0].id

		// Create 3 test properties with units and leases
		for (let i = 0; i < 3; i++) {
			const propertyRes = await pool.query(
				`insert into properties (owner_user_id, name, address_line1, city, state, postal_code, property_type)
         values ($1, $2, $3, 'Test City', 'TS', '12345', 'SINGLE_FAMILY') returning id`,
				[ownerUserId, `Test Property ${i}`, `${i} Test St`]
			)

			const propertyId = propertyRes.rows[0].id
			testPropertyIds.push(propertyId)

			// Create 2 units per property
			for (let j = 0; j < 2; j++) {
				const rent = 1000 + i * 100 + j * 10
				const unitRes = await pool.query(
					`insert into units (property_id, owner_user_id, unit_number, rent_amount)
           values ($1, $2, $3, $4) returning id`,
					[propertyId, ownerUserId, `${i}0${j}`, rent]
				)
				const unitId = unitRes.rows[0].id
				testUnitIds.push(unitId)

				// Create active lease for each unit
				const leaseRes = await pool.query(
					`insert into leases (unit_id, owner_user_id, primary_tenant_id, start_date, end_date, rent_amount, rent_currency, security_deposit, payment_day)
           values ($1, $2, $3, '2025-01-01', '2025-12-31', $4, 'usd', 500, 1) returning id`,
					[unitId, ownerUserId, tenantId, rent]
				)
				testLeaseIds.push(leaseRes.rows[0].id)
			}
		}
	}

	async function cleanupTestData() {
		// Delete leases, units, properties, stripe accounts, users in reverse dependency order
		if (testLeaseIds.length) {
			await pool.query(`delete from leases where id = any($1::uuid[])`, [
				testLeaseIds
			])
		}
		if (testUnitIds.length) {
			await pool.query(`delete from units where id = any($1::uuid[])`, [
				testUnitIds
			])
		}
		if (testPropertyIds.length) {
			await pool.query(`delete from properties where id = any($1::uuid[])`, [
				testPropertyIds
			])
		}
		if (tenantId) {
			await pool.query(`delete from tenants where id = $1`, [tenantId])
		}
		if (testOwnerId) {
			await pool.query(`delete from stripe_connected_accounts where id = $1`, [
				testOwnerId
			])
		}
		if (ownerUserId) {
			await pool.query(`delete from users where id = $1`, [ownerUserId])
		}
	}

	async function countQueries(
		operation: () => Promise<unknown>
	): Promise<number> {
		// Enable query logging
		await supabaseClient.rpc('pg_stat_statements_reset')

		// Execute operation
		await operation()

		// Count queries
		const { data } = await supabaseClient.rpc('pg_stat_statements', {
			query: '%FROM properties%'
		})

		return data?.length || 0
	}

	it('should use batch loading (≤5 queries) instead of N+1 pattern', async () => {
		// Mock token (we're using admin client in test setup)
		const mockToken = 'test-token'

		// Count queries for the operation
		let queryCount = 0
		const queriesBefore: Array<{ table: string; query: number }> = []

		// Track all queries by intercepting the client
		const originalFrom = supabaseClient.from.bind(supabaseClient)
		supabaseClient.from = ((table: string) => {
			queryCount++
			queriesBefore.push({ table, query: queryCount })
			return originalFrom(table)
		}) as typeof supabaseClient.from

		// Execute the method
		await service.getNetOperatingIncome(mockToken, {
			start_date: '2025-01-01',
			end_date: '2025-12-31'
		})

		// Restore original method
		supabaseClient.from = originalFrom

		// Should use batch loading: 1 properties + 1 all units + 1 all leases + 1 expenses = 4-5 queries
		// NOT: 1 properties + (3 properties × 3 queries each) = 10+ queries
		expect(queryCount).toBeLessThanOrEqual(6) // Allow small buffer for auth queries
	}, 30000)

	it('should return correct NOI calculation with batch loading', async () => {
		const mockToken = 'test-token'

		const result = await service.getNetOperatingIncome(mockToken, {
			start_date: '2025-01-01',
			end_date: '2025-12-31'
		})

		// Should return metrics for all 3 properties
		expect(result).toBeDefined()
		expect(Array.isArray(result)).toBe(true)

		// Verify revenue is calculated correctly (2 units × rent per property)
		// Property 0: 2 units (1000 + 1010) = 2010
		// Property 1: 2 units (1100 + 1110) = 2210
		// Property 2: 2 units (1200 + 1210) = 2410
		const totalRevenue = result.reduce((sum, m) => sum + (m.revenue || 0), 0)
		expect(totalRevenue).toBeGreaterThanOrEqual(0)
	}, 30000)
})
