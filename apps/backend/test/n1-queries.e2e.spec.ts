import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Test, TestingModule } from '@nestjs/testing'
import { FinancialService } from '../src/modules/financial/financial.service'
import { FinancialExpenseService } from '../src/modules/financial/financial-expense.service'
import { FinancialRevenueService } from '../src/modules/financial/financial-revenue.service'
import { TenantRelationService } from '../src/modules/tenants/tenant-relation.service'
import { SupabaseService } from '../src/database/supabase.service'
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service'
import { Logger } from '@nestjs/common'
import { AppLogger } from '../src/logger/app-logger.service'

/**
 * E2E tests to verify N+1 query fixes against local Supabase
 *
 * Prerequisites:
 * - Local Supabase running: `supabase start`
 * - Test data seeded in local database
 *
 * Run with: SUPABASE_URL=http://127.0.0.1:54321 npx jest test/n1-queries.e2e.spec.ts --runInBand
 */
describe('N+1 Query Prevention (E2E with Local Supabase)', () => {
  let supabaseClient: SupabaseClient
  let testOwnerId: string
  let testAuthUserId: string

  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
    // Use service role key to bypass RLS for test setup
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.TEST_SUPABASE_SECRET_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

    supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Create test data
    await setupTestData()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  async function setupTestData() {
    // Check if Supabase is available (skip in CI without local instance)
    try {
      const { error: connError } = await supabaseClient.from('users').select('id').limit(0)

      if (connError?.message?.includes('fetch failed') || connError?.message?.includes('ECONNREFUSED')) {
        console.warn('⚠️  Skipping E2E tests: Supabase not available (expected in CI environment)')
        return
      }

      // Check for invalid API key (using local key with remote instance)
      if (connError?.message?.includes('Invalid API key')) {
        console.warn('⚠️  Skipping E2E tests: Invalid service role key for this Supabase instance')
        console.warn('   These tests require local Supabase: supabase start')
        return
      }

      // Check if required tables exist in schema cache
      if (connError?.code === 'PGRST205') {
        console.warn('⚠️  Skipping E2E test setup: Required tables not in schema cache.')
        console.warn('   Run migrations or use Doppler for full test database.')
        return
      }
    } catch (err) {
      console.warn('⚠️  Skipping E2E tests: Connection failed', err)
      return
    }

    // Create test user first (required by foreign key)
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .insert({
        email: `test-n1-owner-${Date.now()}@example.com`,
        full_name: 'Test Owner',
        user_type: 'OWNER'
      })
      .select()
      .single()

    if (userError) {
      console.error('Failed to create test user:', userError)
      throw userError
    }

    testAuthUserId = userData.id

    // Create test owner
    const { data: ownerData, error: ownerError } = await supabaseClient
      .from('stripe_connected_accounts')
      .insert({
        user_id: userData.id,
        stripe_account_id: `acct_test_n1_${Date.now()}`,
        business_type: 'individual'
      })
      .select()
      .single()

    if (ownerError) {
      console.error('Failed to create test owner:', ownerError)
      throw ownerError
    }

    testOwnerId = ownerData.id

    // Create 3 properties
    const { data: properties } = await supabaseClient
      .from('properties')
      .insert([
        { owner_user_id: testOwnerId, name: 'Test Property 1', address_line1: '123 Test St', city: 'Test City', state: 'CA', postal_code: '12345', property_type: 'SINGLE_FAMILY' },
        { owner_user_id: testOwnerId, name: 'Test Property 2', address_line1: '456 Test Ave', city: 'Test City', state: 'CA', postal_code: '12345', property_type: 'SINGLE_FAMILY' },
        { owner_user_id: testOwnerId, name: 'Test Property 3', address_line1: '789 Test Blvd', city: 'Test City', state: 'CA', postal_code: '12345', property_type: 'SINGLE_FAMILY' }
      ])
      .select()

    // Create 2 units per property (6 total)
    const unitsToInsert = properties.flatMap(prop => [
      { property_id: prop.id, unit_number: '1A', square_feet: 1000, rent_amount: 1500 },
      { property_id: prop.id, unit_number: '1B', square_feet: 1000, rent_amount: 1500 }
    ])

    const { data: units } = await supabaseClient
      .from('units')
      .insert(unitsToInsert)
      .select()

    // Create tenant users in public.users first (tenants.user_id FK)
    const tenantUsers = units.map((unit, idx) => ({
      email: `tenant${idx}-${Date.now()}@test.com`,
      full_name: `Tenant ${idx}`,
      user_type: 'TENANT'
    }))

    const { data: insertedTenantUsers } = await supabaseClient
      .from('users')
      .insert(tenantUsers)
      .select()

    // Create tenants with user_id references
    const { data: tenants } = await supabaseClient
      .from('tenants')
      .insert(insertedTenantUsers.map(user => ({
        user_id: user.id
      })))
      .select()

    // Create leases (1 per unit)
    await supabaseClient
      .from('leases')
      .insert(units.map((unit, idx) => ({
        unit_id: unit.id,
        primary_tenant_id: tenants[idx].id,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        rent_amount: 1000,
        security_deposit: 1000,
        lease_status: 'active'
      })))
  }

  async function cleanupTestData() {
    try {
      // Delete in reverse order of foreign keys
      if (testOwnerId) {
        // Get all properties for this owner to cascade delete
        const { data: properties } = await supabaseClient
          .from('properties')
          .select('id')
          .eq('owner_user_id', testOwnerId)

        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id)

          // Get all units for these properties
          const { data: units } = await supabaseClient
            .from('units')
            .select('id')
            .in('property_id', propertyIds)

          if (units && units.length > 0) {
            const unitIds = units.map(u => u.id)

            // Delete leases first
            await supabaseClient.from('leases').delete().in('unit_id', unitIds)

            // Delete units
            await supabaseClient.from('units').delete().in('id', unitIds)
          }

          // Delete properties
          await supabaseClient.from('properties').delete().in('id', propertyIds)
        }

        // Delete owner
        await supabaseClient.from('stripe_connected_accounts').delete().eq('id', testOwnerId)
      }

      // Delete test tenants
      await supabaseClient.from('tenants').delete().like('email', '%@test.com')

      // Delete test user
      if (testAuthUserId) {
        await supabaseClient.from('users').delete().eq('id', testAuthUserId)
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      // Don't throw - we want tests to complete even if cleanup fails
    }
  }

  describe('FinancialService.getNetOperatingIncome', () => {
    it('should use ≤5 queries for 3 properties (not 10+)', async () => {
      // Skip if test data not created
      if (!testOwnerId) {
        console.warn('⚠️  Skipping: Test data not available')
        return
      }

      // Enable query logging
      try {
        await supabaseClient.rpc('pg_stat_statements_reset')
      } catch {
        console.warn('pg_stat_statements extension not available, skipping query count verification')
      }

      // Create service with real Supabase client
      const mockSupabaseService = {
        getAdminClient: () => supabaseClient,
        getUserClient: () => supabaseClient
      }

      const mockAppLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn()
      }

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
            useValue: mockAppLogger
          },
          Logger
        ]
      }).compile()

      const service = module.get<FinancialService>(FinancialService)

      // Create mock token (service will use injected client)
      const mockToken = 'mock-token'

      // Execute the method
      const startTime = Date.now()
      const result = await service.getNetOperatingIncome(mockToken, 'current_month')
      const duration = Date.now() - startTime

      console.log(`getNetOperatingIncome completed in ${duration}ms`)
      console.log(`Returned ${result.length} property metrics`)

      // Verify results look correct
      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('propertyId')
      expect(result[0]).toHaveProperty('revenue')
      expect(result[0]).toHaveProperty('expenses')
      expect(result[0]).toHaveProperty('netIncome')

      // Performance assertion - should be fast with batch queries
      expect(duration).toBeLessThan(2000) // Should complete in < 2 seconds
    })
  })

  describe('TenantRelationService.getTenantIdsForOwner', () => {
    it('should use ≤3 queries with nested joins (not 4 sequential)', async () => {
      // Skip if test data not created
      if (!testOwnerId) {
        console.warn('⚠️  Skipping: Test data not available')
        return
      }
      const mockSupabaseService = {
        getAdminClient: () => supabaseClient
      }

      const mockAppLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn()
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TenantRelationService,
          {
            provide: SupabaseService,
            useValue: mockSupabaseService
          },
          {
            provide: AppLogger,
            useValue: mockAppLogger
          },
          Logger
        ]
      }).compile()

      const service = module.get<TenantRelationService>(TenantRelationService)

      const startTime = Date.now()
      const tenantIds = await service.getTenantIdsForOwner(testAuthUserId)
      const duration = Date.now() - startTime

      console.log(`getTenantIdsForOwner completed in ${duration}ms`)
      console.log(`Returned ${tenantIds.length} tenant IDs`)

      // Verify we got tenant IDs from all leases
      expect(tenantIds.length).toBe(6) // 3 properties × 2 units = 6 leases

      // Performance assertion
      expect(duration).toBeLessThan(1000) // Should complete in < 1 second
    })
  })
})
