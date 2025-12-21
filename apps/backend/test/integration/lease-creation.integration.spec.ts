/**
 * Lease Creation Integration Tests (TDD - RED Phase)
 *
 * These tests mirror production environment:
 * - Real Supabase database (not mocked)
 * - RLS policies enforced
 * - Multi-user isolation validated
 * - JWT authentication required
 * - Database constraints verified
 *
 * PREREQUISITES:
 * - Backend running: `doppler run -- pnpm --filter @repo/backend dev`
 * - Test users configured in Doppler (E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, etc.)
 * - Database migrations applied
 *
 * TDD WORKFLOW:
 * 1. RED: Write failing test that describes expected behavior
 * 2. GREEN: Implement minimal code to make test pass
 * 3. REFACTOR: Improve code while keeping tests green
 */

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'
import request from 'supertest'
import { createHash } from 'crypto'
import {
	authenticateAs,
	getServiceRoleClient,
	TEST_USERS,
	isTestUserAvailable,
	type AuthenticatedTestClient
} from './rls/setup'
import { AppModule } from '../../src/app.module'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'

/**
 * Generate deterministic UUIDs for test data
 * Same input always produces same UUID across test runs
 */
const toUUID = (str: string): string => {
	const hash = createHash('sha256').update(str).digest('hex')
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

describe('Lease Creation Integration (TDD)', () => {
	jest.setTimeout(60000)

	let app: INestApplication
	let ownerA: AuthenticatedTestClient
	let ownerB: AuthenticatedTestClient | null = null
	let serviceRoleClient: SupabaseClient<Database>

	// Deterministic test IDs for ownerA
	const ownerAPropertyId = toUUID('ownerA-lease-test-property-1')
	const testUnitId = toUUID('ownerA-lease-test-unit-1')
	const seededTenantId = toUUID('ownerA-lease-test-tenant-1')
	let testTenantId = seededTenantId
	const testInvitationId = toUUID('ownerA-lease-test-invitation-1')

	beforeAll(async () => {
		// Initialize NestJS app
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule]
		}).compile()

		app = moduleFixture.createNestApplication()

		// Set global prefix (matches production setup in main.ts)
		app.setGlobalPrefix('api/v1')

		// Add Zod validation pipe (matches production setup in main.ts line 110)
		// CRITICAL: Must use ZodValidationPipe, not ValidationPipe!
		app.useGlobalPipes(new ZodValidationPipe())

		await app.init()

		// Authenticate test users
		serviceRoleClient = getServiceRoleClient()
		ownerA = await authenticateAs(TEST_USERS.OWNER_A)

		// ownerB is optional - tests requiring it will be skipped if unavailable
		if (isTestUserAvailable('OWNER_B')) {
			ownerB = await authenticateAs(TEST_USERS.OWNER_B)
		}

		// Setup test data for ownerA using service role client
		await setupOwnerATestData()
	})

	afterAll(async () => {
		// Cleanup test data in reverse FK order
		await cleanupTestData()
		await app.close()
	})

	/**
	 * Setup test data for ownerA:
	 * - Property
	 * - Unit
	 * - Tenant (with invitation accepted)
	 */
	async function setupOwnerATestData() {
		console.log('\n🔧 Setting up test data...')

		// Authenticate as E2E tenant to get their actual user_id from auth
		// This mimics production where users are created via auth signup, NOT manually in public.users
		let tenantUserId: string
		let tenantEmail: string

		if (isTestUserAvailable('TENANT_A')) {
			const tenantAuth = await authenticateAs(TEST_USERS.TENANT_A)
			tenantUserId = tenantAuth.user_id
			tenantEmail = tenantAuth.email
			console.log(`  ✅ Using existing E2E tenant: ${tenantEmail} (${tenantUserId})`)
		} else {
			throw new Error(
				'E2E_TENANT_EMAIL not configured. Set E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD in Doppler.'
			)
		}

		console.log(`  Property ID: ${ownerAPropertyId}`)
		console.log(`  Unit ID: ${testUnitId}`)
		console.log(`  Tenant Record ID: ${testTenantId}`)
		console.log(`  Owner User ID: ${ownerA.user_id}`)
		console.log(`  Tenant User ID: ${tenantUserId}`)

		// Create property
		const { error: propertyError } = await serviceRoleClient.from('properties').upsert({
			id: ownerAPropertyId,
			owner_user_id: ownerA.user_id,
			name: 'Lease Test Property',
			address_line1: '123 Test St',
			city: 'Austin',
			state: 'TX',
			postal_code: '78701',
			property_type: 'SINGLE_FAMILY',
			status: 'active'
		})
		if (propertyError) {
			console.error('❌ Failed to create property:', propertyError)
			throw new Error(`Property creation failed: ${propertyError.message}`)
		}
		console.log('  ✅ Property created')

		// Create unit
		const { error: unitError } = await serviceRoleClient.from('units').upsert({
			id: testUnitId,
			property_id: ownerAPropertyId,
			owner_user_id: ownerA.user_id,
			unit_number: '101',
			rent_amount: 150000, // $1,500
			bedrooms: 2,
			bathrooms: 1,
			square_feet: 800,
			status: 'available'
		})
		if (unitError) {
			console.error('❌ Failed to create unit:', unitError)
			throw new Error(`Unit creation failed: ${unitError.message}`)
		}
		console.log('  ✅ Unit created')

		// Create tenant record using service role (production creates via invitation flow)
		// Check if tenant record already exists for this user
		const { data: existingTenant } = await serviceRoleClient
			.from('tenants')
			.select('id')
			.eq('user_id', tenantUserId)
			.maybeSingle()

		let actualTenantRecordId: string

			if (existingTenant) {
				actualTenantRecordId = existingTenant.id
				console.log(`  ✅ Using existing tenant record: ${actualTenantRecordId}`)
			} else {
			// Create new tenant record for test setup
			const { error: tenantError } = await serviceRoleClient
				.from('tenants')
				.insert({
						id: seededTenantId,
						user_id: tenantUserId, // References auth.users.id (already exists from E2E setup)
						stripe_customer_id: ''
					})

			if (tenantError) {
				console.error('❌ Failed to create tenant record:', tenantError)
				throw new Error(`Tenant creation failed: ${tenantError.message}`)
			}

				actualTenantRecordId = seededTenantId
				console.log(`  ✅ Created tenant record: ${actualTenantRecordId}`)
			}

			testTenantId = actualTenantRecordId

		// Create accepted invitation (required for lease creation)
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 7)

		const { error: invitationError } = await serviceRoleClient.from('tenant_invitations').upsert({
			id: testInvitationId,
			email: tenantEmail, // Use actual tenant email
			property_id: ownerAPropertyId,
			unit_id: testUnitId,
			owner_user_id: ownerA.user_id,
			invitation_code: createHash('sha256').update('test-invitation').digest('hex').slice(0, 64),
			invitation_url: 'https://test.com/invite',
			expires_at: expiresAt.toISOString(),
			accepted_at: new Date().toISOString(), // ACCEPTED
			accepted_by_user_id: tenantUserId // Use actual tenant user ID
		})
		if (invitationError) {
			console.error('❌ Failed to create invitation:', invitationError)
			throw new Error(`Invitation creation failed: ${invitationError.message}`)
		}
		console.log('  ✅ Invitation created')
		console.log('✅ Test data setup complete\n')
	}

	/**
	 * Cleanup test data in reverse FK order
	 */
	async function cleanupTestData() {
		// Delete leases (will be created during tests)
		await serviceRoleClient
			.from('leases')
			.delete()
			.eq('unit_id', testUnitId)

		// Delete invitation
		await serviceRoleClient
			.from('tenant_invitations')
			.delete()
			.eq('id', testInvitationId)

		// Delete tenant
		await serviceRoleClient
			.from('tenants')
			.delete()
			.eq('id', seededTenantId)

		// Delete unit
		await serviceRoleClient
			.from('units')
			.delete()
			.eq('id', testUnitId)

		// Delete property
		await serviceRoleClient
			.from('properties')
			.delete()
			.eq('id', ownerAPropertyId)
	}

	/**
	 * ===========================================
	 * 🔴 RED PHASE: INTEGRATION TESTS
	 * ===========================================
	 *
	 * These tests are written BEFORE implementation.
	 * They define expected behavior and should initially FAIL.
	 *
	 * After writing all tests, implement code to make them pass (GREEN phase).
	 */

	describe('POST /api/v1/leases', () => {
		/**
		 * Test 1: Happy Path - Create Draft Lease
		 * Verifies basic lease creation with valid data
		 */
		it('should create draft lease with valid data', async () => {
			// GIVEN: Valid lease payload
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000, // $1,500.00 in cents
				security_deposit: 150000,
				payment_day: 1,
				lease_status: 'draft'
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)

			// DEBUG: Log the actual error if not 201
			if (response.status !== 201) {
				console.error('\n❌ TEST 1 FAILED - Create draft lease')
				console.error('Status:', response.status)
				console.error('Error Body:', JSON.stringify(response.body, null, 2))
				console.error('Payload Sent:', JSON.stringify(payload, null, 2))
			}

			expect(response.status).toBe(201)

			// THEN: Response contains created lease
			expect(response.body).toMatchObject({
				id: expect.any(String),
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				lease_status: 'draft',
				rent_amount: 150000,
				security_deposit: 150000,
				payment_day: 1,
				created_at: expect.any(String),
				updated_at: expect.any(String)
			})

			// THEN: Verify lease persisted in database (RLS check)
			const { data, error } = await ownerA.client
				.from('leases')
				.select('*')
				.eq('id', response.body.id)
				.single()

			expect(error).toBeNull()
			expect(data).toBeTruthy()
			expect(data.lease_status).toBe('draft')
		})

		/**
		 * Test 2: RLS Enforcement - Tenant Not Invited
		 * Verifies business rule: tenant must have accepted invitation to property
		 */
		it('should reject lease creation if tenant not invited to property', async () => {
			// GIVEN: Tenant exists but no invitation to this property
			const uninvitedTenantId = toUUID('uninvited-tenant-record')
			const uninvitedTenantUserId = toUUID('uninvited-tenant-user')

			try {
				// Create required public.users row (tenants.user_id has FK to users.id)
				await serviceRoleClient.from('users').upsert({
					id: uninvitedTenantUserId,
					email: `uninvited-${uninvitedTenantUserId.slice(0, 8)}@example.com`,
					full_name: 'Uninvited Tenant',
					user_type: 'TENANT',
					status: 'active'
				})

				await serviceRoleClient.from('tenants').upsert({
					id: uninvitedTenantId,
					user_id: uninvitedTenantUserId,
					stripe_customer_id: null
				})

				const payload = {
					unit_id: testUnitId,
					primary_tenant_id: uninvitedTenantId,
					start_date: '2025-01-01',
					end_date: '2026-01-01',
					rent_amount: 150000
				}

				// WHEN: POST /api/v1/leases
				const response = await request(app.getHttpServer())
					.post('/api/v1/leases')
					.set('Authorization', `Bearer ${ownerA.accessToken}`)
					.send(payload)
					.expect(400)

				// THEN: Error message indicates tenant must be invited
				expect(response.body.message).toMatch(/tenant must be invited|invitation/i)
			} finally {
				await serviceRoleClient.from('tenants').delete().eq('id', uninvitedTenantId)
				await serviceRoleClient.from('users').delete().eq('id', uninvitedTenantUserId)
			}
		})

		/**
		 * Test 3: RLS Enforcement - Cross-User Isolation
		 * Verifies ownerA cannot create lease with ownerB's unit
		 */
		it('should prevent ownerA from creating lease with ownerB unit', async () => {
			if (!ownerB) {
				console.log('[SKIP] Test requires OWNER_B credentials')
				return
			}

			// GIVEN: ownerB has a unit
			const ownerBPropertyId = toUUID('ownerB-property-1')
			const ownerBUnitId = toUUID('ownerB-unit-1')

			await serviceRoleClient.from('properties').insert({
				id: ownerBPropertyId,
				owner_user_id: ownerB.user_id,
				name: 'Owner B Property',
				address_line1: '456 B St',
				city: 'Austin',
				state: 'TX',
				postal_code: '78702',
				property_type: 'SINGLE_FAMILY',
				status: 'active'
			})

			await serviceRoleClient.from('units').insert({
				id: ownerBUnitId,
				property_id: ownerBPropertyId,
				owner_user_id: ownerB.user_id,
				unit_number: '201',
				rent_amount: 200000,
				bedrooms: 2,
				bathrooms: 1,
				square_feet: 900,
				status: 'vacant'
			})

			const payload = {
				unit_id: ownerBUnitId, // Try to use ownerB's unit
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000
			}

			// WHEN: ownerA tries to create lease
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Error indicates unit not found (RLS filtered it)
			expect(response.body.message).toMatch(/unit not found|access/i)

			// Cleanup
			await serviceRoleClient.from('units').delete().eq('id', ownerBUnitId)
			await serviceRoleClient.from('properties').delete().eq('id', ownerBPropertyId)
		})

		/**
		 * Test 4: Wizard Fields Persistence
		 * Verifies all optional wizard detail fields are persisted correctly
		 */
		it('should persist all wizard detail fields', async () => {
			// GIVEN: Complete wizard payload
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				security_deposit: 150000,
				payment_day: 1,

				// Wizard fields
				max_occupants: 4,
				pets_allowed: true,
				pet_deposit: 50000, // $500
				pet_rent: 5000, // $50/month
				utilities_included: ['electricity', 'water'],
				tenant_responsible_utilities: ['internet', 'cable'],
				property_rules: 'No smoking. Quiet hours 10pm-8am.',
				property_built_before_1978: true,
				lead_paint_disclosure_acknowledged: true,
				governing_state: 'CA'
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(201)

			// THEN: All wizard fields persisted
			expect(response.body).toMatchObject({
				max_occupants: 4,
				pets_allowed: true,
				pet_deposit: 50000,
				pet_rent: 5000,
				utilities_included: expect.arrayContaining(['electricity', 'water']),
				tenant_responsible_utilities: expect.arrayContaining(['internet', 'cable']),
				property_rules: 'No smoking. Quiet hours 10pm-8am.',
				property_built_before_1978: true,
				lead_paint_disclosure_acknowledged: true,
				governing_state: 'CA'
			})

			// THEN: Verify in database
			const { data } = await ownerA.client
				.from('leases')
				.select('*')
				.eq('id', response.body.id)
				.single()

			expect(data.utilities_included).toEqual(
				expect.arrayContaining(['electricity', 'water'])
			)
			expect(data.governing_state).toBe('CA')
		})

		/**
		 * Test 5: Missing Required Fields
		 * Verifies validation for required fields
		 */
		it('should reject lease creation with missing required fields', async () => {
			// GIVEN: Payload missing unit_id
			const payload = {
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Validation error
			expect(response.body.message).toMatch(/unit_id|required/i)
		})

		/**
		 * Test 6: Invalid Unit ID
		 * Verifies behavior when unit doesn't exist
		 */
		it('should reject lease creation with non-existent unit', async () => {
			// GIVEN: Payload with non-existent unit_id
			const fakeUnitId = toUUID('non-existent-unit')

			const payload = {
				unit_id: fakeUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Error indicates unit not found
			expect(response.body.message).toMatch(/unit not found|unit.*exist/i)
		})

		/**
		 * Test 7: Invalid Tenant ID
		 * Verifies behavior when tenant doesn't exist
		 */
		it('should reject lease creation with non-existent tenant', async () => {
			// GIVEN: Payload with non-existent tenant_id
			const fakeTenantId = toUUID('non-existent-tenant')

			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: fakeTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Error indicates tenant not found
			expect(response.body.message).toMatch(/tenant not found|tenant.*exist/i)
		})

		/**
		 * Test 8: Invalid Date Range
		 * Verifies end_date must be after start_date
		 */
		it('should reject lease creation with end date before start date', async () => {
			// GIVEN: Invalid date range
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-12-31',
				end_date: '2025-01-01', // Before start date
				rent_amount: 150000
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Validation error
			expect(response.body.message).toMatch(/end.*after.*start|date.*invalid/i)
		})

		/**
		 * Test 9: Invalid Rent Amount
		 * Verifies rent_amount must be positive
		 */
		it('should reject lease creation with zero rent amount', async () => {
			// GIVEN: Zero rent amount
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 0
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Validation error
			expect(response.body.message).toMatch(/rent.*positive|rent.*greater/i)
		})

		/**
		 * Test 10: Invalid Lease Status
		 * Verifies lease_status must be valid enum value
		 */
		it('should reject lease creation with invalid lease status', async () => {
			// GIVEN: Invalid lease_status
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				lease_status: 'invalid_status'
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Validation error
			expect(response.body.message).toMatch(/lease.*status|invalid.*enum/i)
		})

		/**
		 * Test 11: Lead Paint Disclosure Validation
		 * Verifies disclosure required when property_built_before_1978 = true
		 */
		it('should reject lease when lead paint disclosure required but not acknowledged', async () => {
			// GIVEN: Property built before 1978 without disclosure
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				property_built_before_1978: true,
				lead_paint_disclosure_acknowledged: false // Required but not acknowledged
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(400)

			// THEN: Validation error
			expect(response.body.message).toMatch(/lead.*paint.*disclosure|acknowledge.*required/i)
		})

		/**
		 * Test 12: Default Values Applied
		 * Verifies default values are set when not provided
		 */
		it('should apply default values when optional fields not provided', async () => {
			// GIVEN: Minimal payload (no optional fields)
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(201)

			// THEN: Default values applied
			expect(response.body.lease_status).toBe('draft') // Default status
			expect(response.body.payment_day).toBe(1) // Default payment day
			expect(response.body.security_deposit).toBe(0) // Default security deposit
		})

		/**
		 * Test 13: Null Optional Fields
		 * Verifies null values accepted for optional fields
		 */
		it('should accept null values for optional fields', async () => {
			// GIVEN: Payload with explicit null optional fields
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				pet_deposit: null,
				late_fee_amount: null,
				grace_period_days: null
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(201)

			// THEN: Null values accepted
			expect(response.body.pet_deposit).toBeNull()
			expect(response.body.late_fee_amount).toBeNull()
		})

		/**
		 * Test 14: Empty Utilities Arrays
		 * Verifies empty arrays valid for utilities_included
		 */
		it('should accept empty utilities arrays', async () => {
			// GIVEN: Empty utilities arrays
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				utilities_included: [],
				tenant_responsible_utilities: []
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(201)

			// THEN: Empty arrays persisted
			expect(response.body.utilities_included).toEqual([])
			expect(response.body.tenant_responsible_utilities).toEqual([])
		})

		/**
		 * Test 15: Unauthenticated Request
		 * Verifies authentication required
		 */
		it('should reject unauthenticated request with 401', async () => {
			// GIVEN: Valid payload but no auth token
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000
			}

			// WHEN: POST without Authorization header
			await request(app.getHttpServer())
				.post('/api/v1/leases')
				.send(payload)
				.expect(401)
		})

		/**
		 * Test 16: Invitation Not Accepted
		 * Verifies tenant invitation must be accepted (accepted_at IS NOT NULL)
		 */
		it('should reject lease creation if tenant invitation not accepted', async () => {
			// GIVEN: Tenant with pending (unaccepted) invitation
			const pendingTenantId = toUUID('pending-tenant-record')
			const pendingTenantUserId = toUUID('pending-tenant-user')
			const pendingInvitationId = toUUID('pending-invitation')

			try {
				// Create required public.users row (tenants.user_id has FK to users.id)
				await serviceRoleClient.from('users').upsert({
					id: pendingTenantUserId,
					email: 'pending@example.com',
					full_name: 'Pending Tenant',
					user_type: 'TENANT',
					status: 'active'
				})

				await serviceRoleClient.from('tenants').upsert({
					id: pendingTenantId,
					user_id: pendingTenantUserId,
					stripe_customer_id: null
				})

				const expiresAt = new Date()
				expiresAt.setDate(expiresAt.getDate() + 7)

				await serviceRoleClient.from('tenant_invitations').upsert({
					id: pendingInvitationId,
					email: 'pending@example.com',
					property_id: ownerAPropertyId,
					unit_id: testUnitId,
					owner_user_id: ownerA.user_id,
					invitation_code: createHash('sha256').update('pending-inv').digest('hex').slice(0, 64),
					invitation_url: 'https://test.com/pending',
					expires_at: expiresAt.toISOString(),
					accepted_at: null, // NOT ACCEPTED
					accepted_by_user_id: null
				})

				const payload = {
					unit_id: testUnitId,
					primary_tenant_id: pendingTenantId,
					start_date: '2025-01-01',
					end_date: '2026-01-01',
					rent_amount: 150000
				}

				// WHEN: POST /api/v1/leases
				const response = await request(app.getHttpServer())
					.post('/api/v1/leases')
					.set('Authorization', `Bearer ${ownerA.accessToken}`)
					.send(payload)
					.expect(400)

				// THEN: Error indicates invitation not accepted
				expect(response.body.message).toMatch(/invitation.*not.*accepted|pending/i)
			} finally {
				await serviceRoleClient
					.from('tenant_invitations')
					.delete()
					.eq('id', pendingInvitationId)
				await serviceRoleClient.from('tenants').delete().eq('id', pendingTenantId)
				await serviceRoleClient.from('users').delete().eq('id', pendingTenantUserId)
			}
		})

		/**
		 * Test 17: Leap Year Date Validation
		 * Verifies February 29, 2024 (leap year) is valid
		 */
		it('should accept leap year date (Feb 29, 2024)', async () => {
			// GIVEN: Leap year date
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2024-02-29', // Valid leap year date
				end_date: '2025-02-28',
				rent_amount: 150000
			}

			// WHEN: POST /api/v1/leases
			await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(201)
		})

		/**
		 * Test 18: Payment Day Edge Case
		 * Verifies payment_day = 31 valid for all months
		 */
		it('should accept payment day 31 for all months', async () => {
			// GIVEN: Payment day 31
			const payload = {
				unit_id: testUnitId,
				primary_tenant_id: testTenantId,
				start_date: '2025-01-01',
				end_date: '2026-01-01',
				rent_amount: 150000,
				payment_day: 31 // Backend should handle months with <31 days
			}

			// WHEN: POST /api/v1/leases
			const response = await request(app.getHttpServer())
				.post('/api/v1/leases')
				.set('Authorization', `Bearer ${ownerA.accessToken}`)
				.send(payload)
				.expect(201)

			// THEN: payment_day = 31 accepted
			expect(response.body.payment_day).toBe(31)
		})
	})
})
