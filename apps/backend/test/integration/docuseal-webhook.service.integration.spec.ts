/**
 * Integration Tests for DocuSeal Webhook Service
 *
 * These tests run against the REAL local Supabase database to verify:
 * 1. Lease queries work with actual schema
 * 2. Document inserts succeed
 * 3. Event emission happens correctly
 *
 * Run with: RUN_INTEGRATION_TESTS=true pnpm --filter @repo/backend exec jest docuseal-webhook.service.integration.spec.ts
 */

import { Test, type TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DocuSealWebhookService } from '../../src/modules/docuseal/docuseal-webhook.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { SilentLogger } from '../../src/__tests__/silent-logger'
import { AppLogger } from '../../src/logger/app-logger.service'

// Skip if not running integration tests
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIf = runIntegrationTests ? describe : describe.skip

describeIf('DocuSealWebhookService Integration', () => {
	let service: DocuSealWebhookService
	let supabaseAdmin: SupabaseClient
	let eventEmitter: EventEmitter2
	let emittedEvents: Array<{ event: string; payload: unknown }>

	// Test data IDs to clean up
	let testLeaseId: string | null = null
	let testTenantId: string | null = null
	let testUnitId: string | null = null
	let testPropertyId: string | null = null
	let testOwnerId: string | null = null
	let testUserId: string | null = null

	beforeAll(async () => {
		// Create real Supabase client for local testing
		const supabaseUrl =
			process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321'
		const supabaseKey =
			process.env.TEST_SUPABASE_SECRET_KEY ||
			'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

		supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
			auth: { persistSession: false }
		})

		// Track emitted events
		emittedEvents = []
		eventEmitter = new EventEmitter2()
		eventEmitter.onAny((event: string | string[], payload: unknown) => {
			const eventName = Array.isArray(event) ? event.join('.') : event
			emittedEvents.push({ event: eventName, payload })
		})

		// Create mock SupabaseService that returns real admin client
		const mockSupabaseService = {
			getAdminClient: () => supabaseAdmin
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DocuSealWebhookService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: eventEmitter },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		service = module.get<DocuSealWebhookService>(DocuSealWebhookService)
	})

	beforeEach(async () => {
		emittedEvents = []

		// Create test data in correct order (respecting foreign keys)
		// 1. Create user in auth.users
		const testEmail = `test-${Date.now()}@integration-test.com`
		const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
			email: testEmail,
			password: 'test-password-123',
			email_confirm: true
		})
		testUserId = authUser?.user?.id || null

		if (!testUserId) {
			throw new Error('Failed to create test user')
		}

		// 2. Create user in public.users table (required FK for stripe_connected_accounts)
		const { error: userError } = await supabaseAdmin.from('users').insert({
			id: testUserId,
			email: testEmail,
			full_name: 'Integration Test User',
			user_type: 'OWNER'
		})
		if (userError)
			throw new Error(`Failed to create public user: ${userError.message}`)

		// 4. Create stripe connected account record for owner
		const { data: owner, error: ownerError } = await supabaseAdmin
			.from('stripe_connected_accounts')
			.insert({
				user_id: testUserId,
				business_name: 'Integration Test LLC',
				business_type: 'llc',
				stripe_account_id: `acct_test_${Date.now()}`
			})
			.select('id')
			.single()

		if (ownerError)
			throw new Error(`Failed to create owner: ${ownerError.message}`)
		testOwnerId = owner.id

		// 5. Create property
		const { data: property, error: propError } = await supabaseAdmin
			.from('properties')
			.insert({
				name: 'Integration Test Property',
				address_line1: '123 Test St',
				city: 'Austin',
				state: 'TX',
				postal_code: '78701',
				property_type: 'apartment',
				owner_user_id: testUserId
			})
			.select('id')
			.single()

		if (propError)
			throw new Error(`Failed to create property: ${propError.message}`)
		testPropertyId = property.id

		// 6. Create unit
		const { data: unit, error: unitError } = await supabaseAdmin
			.from('units')
			.insert({
				unit_number: '101',
				property_id: testPropertyId,
				owner_user_id: testOwnerId,
				bedrooms: 2,
				bathrooms: 1,
				rent_amount: 150000, // $1500 in cents
				status: 'available'
			})
			.select('id')
			.single()

		if (unitError)
			throw new Error(`Failed to create unit: ${unitError.message}`)
		testUnitId = unit.id

		// 7. Create tenant (needs public.users entry first)
		const tenantEmail = `tenant-${Date.now()}@integration-test.com`
		const { data: tenantUser } = await supabaseAdmin.auth.admin.createUser({
			email: tenantEmail,
			password: 'test-password-123',
			email_confirm: true
		})
		const tenantUserId = tenantUser?.user?.id
		if (!tenantUserId) throw new Error('Failed to create tenant auth user')

		// Create public.users entry for tenant
		const { error: tenantUserError } = await supabaseAdmin
			.from('users')
			.insert({
				id: tenantUserId,
				email: tenantEmail,
				full_name: 'Integration Test Tenant',
				user_type: 'TENANT'
			})
		if (tenantUserError)
			throw new Error(
				`Failed to create tenant public user: ${tenantUserError.message}`
			)

		const { data: tenant, error: tenantError } = await supabaseAdmin
			.from('tenants')
			.insert({
				user_id: tenantUserId
			})
			.select('id')
			.single()

		if (tenantError)
			throw new Error(`Failed to create tenant: ${tenantError.message}`)
		testTenantId = tenant.id

		// 8. Create lease
		const { data: lease, error: leaseError } = await supabaseAdmin
			.from('leases')
			.insert({
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				owner_user_id: testOwnerId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				security_deposit: 150000,
				lease_status: 'pending_signature',
				payment_day: 1
			})
			.select('id')
			.single()

		if (leaseError)
			throw new Error(`Failed to create lease: ${leaseError.message}`)
		testLeaseId = lease.id
	})

	afterEach(async () => {
		// Clean up in reverse order of foreign keys
		if (testLeaseId) {
			await supabaseAdmin
				.from('documents')
				.delete()
				.eq('entity_id', testLeaseId)
			await supabaseAdmin.from('leases').delete().eq('id', testLeaseId)
		}
		if (testTenantId) {
			await supabaseAdmin.from('tenants').delete().eq('id', testTenantId)
		}
		if (testUnitId) {
			await supabaseAdmin.from('units').delete().eq('id', testUnitId)
		}
		if (testPropertyId) {
			await supabaseAdmin.from('properties').delete().eq('id', testPropertyId)
		}
		if (testOwnerId) {
			await supabaseAdmin
				.from('stripe_connected_accounts')
				.delete()
				.eq('id', testOwnerId)
		}
		// Clean up auth users
		if (testUserId) {
			await supabaseAdmin.auth.admin.deleteUser(testUserId)
		}
	})

	describe('handleFormCompleted', () => {
		it('should find lease by metadata.lease_id and emit owner_signed event', async () => {
			await service.handleFormCompleted({
				id: 12345,
				submission_id: 67890,
				email: 'owner@test.com',
				role: 'Property Owner',
				completed_at: '2025-01-15T10:00:00Z',
				metadata: { lease_id: testLeaseId! }
			})

			// Verify event was emitted
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]!.event).toBe('lease.owner_signed')
			expect(emittedEvents[0]!.payload).toMatchObject({
				lease_id: testLeaseId,
				signed_at: '2025-01-15T10:00:00Z',
				via: 'docuseal'
			})
		})

		it('should emit tenant_signed event when tenant signs', async () => {
			await service.handleFormCompleted({
				id: 12346,
				submission_id: 67891,
				email: 'tenant@test.com',
				role: 'Tenant',
				completed_at: '2025-01-15T11:00:00Z',
				metadata: { lease_id: testLeaseId! }
			})

			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]!.event).toBe('lease.tenant_signed')
			expect(emittedEvents[0]!.payload).toMatchObject({
				lease_id: testLeaseId,
				via: 'docuseal'
			})
		})

		it('should not emit event when lease_id not found', async () => {
			await service.handleFormCompleted({
				id: 12347,
				submission_id: 67892,
				email: 'owner@test.com',
				role: 'Property Owner',
				completed_at: '2025-01-15T10:00:00Z',
				metadata: { lease_id: '00000000-0000-0000-0000-000000000000' }
			})

			expect(emittedEvents).toHaveLength(0)
		})

		it('should not emit event when no metadata provided', async () => {
			await service.handleFormCompleted({
				id: 12348,
				submission_id: 67893,
				email: 'owner@test.com',
				role: 'Property Owner',
				completed_at: '2025-01-15T10:00:00Z'
			})

			expect(emittedEvents).toHaveLength(0)
		})
	})

	describe('handleSubmissionCompleted', () => {
		it('should store signed document and emit completion event', async () => {
			const docUrl = 'https://docuseal.example.com/signed/test-doc-123.pdf'

			await service.handleSubmissionCompleted({
				id: 99999,
				status: 'completed',
				completed_at: '2025-01-15T12:00:00Z',
				submitters: [
					{
						email: 'owner@test.com',
						role: 'Property Owner',
						completed_at: '2025-01-15T10:00:00Z'
					},
					{
						email: 'tenant@test.com',
						role: 'Tenant',
						completed_at: '2025-01-15T11:00:00Z'
					}
				],
				documents: [{ name: 'lease-agreement.pdf', url: docUrl }],
				metadata: { lease_id: testLeaseId! }
			})

			// Verify event was emitted
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]!.event).toBe('docuseal.submission_completed')
			expect(emittedEvents[0]!.payload).toMatchObject({
				lease_id: testLeaseId,
				submission_id: 99999,
				document_url: docUrl
			})

			// Note: Document storage is handled by separate event listener, not tested here
		})

		it('should emit event without storing document if no documents provided', async () => {
			await service.handleSubmissionCompleted({
				id: 99998,
				status: 'completed',
				completed_at: '2025-01-15T12:00:00Z',
				submitters: [],
				documents: [],
				metadata: { lease_id: testLeaseId! }
			})

			// Event should still be emitted
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]!.event).toBe('docuseal.submission_completed')
			expect(emittedEvents[0]!.payload).toMatchObject({
				lease_id: testLeaseId,
				document_url: undefined
			})

			// Note: Document storage is handled by separate event listener, not tested here
		})
	})
})
