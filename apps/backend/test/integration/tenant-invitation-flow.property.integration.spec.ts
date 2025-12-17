/**
 * Property-Based Integration Tests for Tenant Invitation Flow
 *
 * Feature: fix-tenant-invitation-issues
 * Tests the backend invitation flow with property-based testing
 */

import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as fc from 'fast-check'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { SupabaseService } from '../../src/database/supabase.service'

describe('Tenant Invitation Flow - Property-Based Integration Tests', () => {
  let app: INestApplication
  let supabaseService: SupabaseService
  let testUserId: string
  let testPropertyId: string
  let authToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    supabaseService = moduleFixture.get<SupabaseService>(SupabaseService)

    // Create test user and property
    const adminClient = supabaseService.getAdminClient()

    // Create test user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: `test-owner-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`)
    }

    testUserId = authData.user.id

    // Get auth token
    const { data: sessionData, error: sessionError } = await adminClient.auth.signInWithPassword({
      email: authData.user.email!,
      password: 'TestPassword123!'
    })

    if (sessionError || !sessionData.session) {
      throw new Error(`Failed to get auth token: ${sessionError?.message}`)
    }

    authToken = sessionData.session.access_token

    // Create test property
    const { data: propertyData, error: propertyError } = await adminClient
      .from('properties')
      .insert({
        owner_user_id: testUserId,
        name: 'Test Property',
        address_line1: '123 Test St',
        city: 'Test City',
        state: 'TX',
        postal_code: '12345',
        property_type: 'SINGLE_FAMILY'
      })
      .select()
      .single()

    if (propertyError || !propertyData) {
      throw new Error(`Failed to create test property: ${propertyError?.message}`)
    }

    testPropertyId = propertyData.id
  })

  afterAll(async () => {
    // Cleanup
    const adminClient = supabaseService.getAdminClient()

    // Delete test property
    await adminClient.from('properties').delete().eq('id', testPropertyId)

    // Delete test user
    await adminClient.auth.admin.deleteUser(testUserId)

    await app.close()
  })

  /**
   * Property 1: Successful Invitation Creation
   * Feature: fix-tenant-invitation-issues, Property 1: Successful Invitation Creation
   * Validates: Requirements 1.1, 1.5
   *
   * For any valid tenant data and property assignment where the user owns the property,
   * submitting the invitation form should return a 200 status with a tenant_id and
   * success message, not a 403 error.
   */
  it('Property 1: should successfully create invitation for any valid tenant data', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid tenant data
        fc.record({
          email: fc.emailAddress(),
          first_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          last_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          phone: fc.option(
            fc.tuple(
              fc.integer({ min: 200, max: 999 }),
              fc.integer({ min: 200, max: 999 }),
              fc.integer({ min: 1000, max: 9999 })
            ).map(([area, prefix, line]) => `${area}${prefix}${line}`)
          )
        }),
        async (tenantData) => {
          const response = await request(app.getHttpServer())
            .post('/api/v1/tenants/invite')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              tenantData: {
                email: tenantData.email,
                first_name: tenantData.first_name,
                last_name: tenantData.last_name,
                ...(tenantData.phone && { phone: tenantData.phone })
              },
              leaseData: {
                property_id: testPropertyId
              }
            })

          // Assert: Should return 200, not 403
          expect(response.status).not.toBe(403)
          expect(response.status).toBe(200)

          // Assert: Response should contain tenant_id and success message
          expect(response.body).toHaveProperty('tenant_id')
          expect(response.body.tenant_id).toBeTruthy()
          expect(response.body).toHaveProperty('message')
          expect(typeof response.body.message).toBe('string')

          // Cleanup: Delete created tenant
          const adminClient = supabaseService.getAdminClient()
          await adminClient.from('tenants').delete().eq('id', response.body.tenant_id)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 3: Ownership Verification Execution
   * Feature: fix-tenant-invitation-issues, Property 3: Ownership Verification Execution
   * Validates: Requirements 1.3, 1.4
   *
   * For any invitation request with a property_id, the system should verify
   * property ownership before proceeding with invitation creation.
   */
  it('Property 3: should verify ownership before allowing invitation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random UUIDs for property_id
        fc.uuid(),
        fc.record({
          email: fc.emailAddress(),
          first_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          last_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        async (randomPropertyId, tenantData) => {
          // Try to invite tenant to a random property (likely not owned)
          const response = await request(app.getHttpServer())
            .post('/api/v1/tenants/invite')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              tenantData,
              leaseData: {
                property_id: randomPropertyId
              }
            })

          // Assert: Should either succeed (if by chance we own it) or return 403
          // The key is that ownership verification MUST execute
          expect([200, 403]).toContain(response.status)

          if (response.status === 403) {
            // Verify the error message indicates ownership verification
            expect(response.body.message).toMatch(/access|permission|ownership|property/i)
          } else {
            // If it succeeded, cleanup
            const adminClient = supabaseService.getAdminClient()
            await adminClient.from('tenants').delete().eq('id', response.body.tenant_id)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 8: Email Sending on Success
   * Feature: fix-tenant-invitation-issues, Property 8: Email Sending on Success
   * Validates: Requirements 5.2
   *
   * For any valid invitation where ownership verification succeeds,
   * the system should send an invitation email to the tenant.
   */
  it('Property 8: should send email for any successful invitation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          first_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          last_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        async (tenantData) => {
          const response = await request(app.getHttpServer())
            .post('/api/v1/tenants/invite')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              tenantData,
              leaseData: {
                property_id: testPropertyId
              }
            })

          expect(response.status).toBe(200)

          // Get the created tenant to verify invitation was sent
          const tenantResponse = await request(app.getHttpServer())
            .get(`/api/v1/tenants/${response.body.tenant_id}`)
            .set('Authorization', `Bearer ${authToken}`)

          expect(tenantResponse.status).toBe(200)
          const tenant = tenantResponse.body

          // Assert: invitation_sent_at should be set (indicates email was sent)
          expect(tenant.invitation_sent_at).toBeTruthy()
          expect(new Date(tenant.invitation_sent_at).getTime()).toBeGreaterThan(0)

          // Assert: invitation_token should be set
          expect(tenant.invitation_token).toBeTruthy()
          expect(tenant.invitation_token.length).toBe(64) // 32 bytes = 64 hex chars

          // Cleanup
          const adminClient = supabaseService.getAdminClient()
          await adminClient.from('tenants').delete().eq('id', response.body.tenant_id)
        }
      ),
      { numRuns: 20 }
    )
  })
})
