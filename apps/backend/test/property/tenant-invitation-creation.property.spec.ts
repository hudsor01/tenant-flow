/**
 * Property 1: Successful Invitation Creation
 * Feature: fix-tenant-invitation-issues, Property 1: Successful Invitation Creation
 * Validates: Requirements 1.1, 1.5
 *
 * For any valid tenant data and property assignment where the user owns the property,
 * submitting the invitation form should return success with an invitation_id,
 * not a 403 error.
 *
 * This test focuses on the core business logic without spinning up the full NestJS app.
 * It tests that invitations can be created successfully for any valid tenant data.
 */

import * as fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { Database } from '@repo/shared/types/supabase'

// Skip this test suite if E2E credentials are not available
const hasE2ECredentials = process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD
const describeOrSkip = hasE2ECredentials ? describe : describe.skip

describeOrSkip('Property 1: Successful Invitation Creation', () => {
  let supabaseUrl: string
  let supabaseKey: string
  let testPropertyId: string
  let testPropertyOwnerId: string

  beforeAll(async () => {
    // Use NEXT_PUBLIC_* vars for test environment
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials for property test')
    }

    // Get test owner credentials (already validated by describeOrSkip)
    const ownerEmail = process.env.E2E_OWNER_EMAIL!
    const ownerPassword = process.env.E2E_OWNER_PASSWORD!

    // Authenticate as test owner
    const client = createClient<Database>(supabaseUrl, supabaseKey)
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword
    })

    if (authError || !authData.user) {
      throw new Error(`Failed to authenticate test owner: ${authError?.message}`)
    }

    // Get property_owner_id
    const { data: ownerData, error: ownerError } = await client
      .from('property_owners')
      .select('id')
      .eq('user_id', authData.user.id)
      .single()

    if (ownerError || !ownerData) {
      throw new Error(`Failed to get property_owner_id: ${ownerError?.message}`)
    }

    testPropertyOwnerId = ownerData.id

    // Get or create a test property
    const { data: properties, error: propError } = await client
      .from('properties')
      .select('id')
      .eq('property_owner_id', testPropertyOwnerId)
      .limit(1)

    if (propError) {
      throw new Error(`Failed to query properties: ${propError.message}`)
    }

    if (properties && properties.length > 0) {
      testPropertyId = properties[0].id
    } else {
      // Create a test property
      const { data: newProperty, error: createError } = await client
        .from('properties')
        .insert({
          property_owner_id: testPropertyOwnerId,
          name: 'Property Test Property',
          address_line1: '123 Test St',
          city: 'Test City',
          state: 'TX',
          postal_code: '12345',
          property_type: 'SINGLE_FAMILY'
        })
        .select('id')
        .single()

      if (createError || !newProperty) {
        throw new Error(`Failed to create test property: ${createError?.message}`)
      }

      testPropertyId = newProperty.id
    }
  })

  /**
   * Property 1: For any valid tenant data and property assignment where the user owns
   * the property, the invitation should be created successfully with an invitation_id.
   */
  it('should successfully create invitation for any valid tenant data', async () => {
    const client = createClient<Database>(supabaseUrl, supabaseKey)

    // Re-authenticate for each test run
    const ownerEmail = process.env.E2E_OWNER_EMAIL!
    const ownerPassword = process.env.E2E_OWNER_PASSWORD!

    const { data: authData } = await client.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword
    })

    if (!authData.session) {
      throw new Error('Failed to get auth session')
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate valid tenant data (email must be unique per invitation)
        fc.record({
          emailPrefix: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
          emailDomain: fc.constantFrom('example.com', 'test.com', 'demo.com')
        }),
        async (emailData) => {
          // Generate unique email with timestamp to avoid conflicts
          const uniqueEmail = `${emailData.emailPrefix}-${Date.now()}@${emailData.emailDomain}`

          // Generate invitation code
          const invitationCode = randomBytes(32).toString('hex')
          const invitationUrl = `https://app.example.com/accept-invite?code=${invitationCode}`

          // Set expiry to 7 days from now
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7)

          // Create invitation (mimics what the service does)
          const { data: invitation, error: inviteError } = await client
            .from('tenant_invitations')
            .insert({
              email: uniqueEmail.toLowerCase(),
              property_owner_id: testPropertyOwnerId,
              property_id: testPropertyId,
              unit_id: null,
              invitation_code: invitationCode,
              invitation_url: invitationUrl,
              status: 'sent',
              type: 'platform_access',
              expires_at: expiresAt.toISOString()
            })
            .select('id')
            .single()

          // Assert: Invitation should be created successfully (not a 403 or other error)
          expect(inviteError).toBeNull()
          expect(invitation).toBeTruthy()
          expect(invitation?.id).toBeTruthy()
          expect(typeof invitation?.id).toBe('string')

          // Cleanup: Delete created invitation
          if (invitation?.id) {
            await client
              .from('tenant_invitations')
              .delete()
              .eq('id', invitation.id)
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})
