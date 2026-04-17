// Tenant Invitation Accept Edge Function
// Accepts a tenant invitation after the user has created their Supabase auth account.
// AUTH-04: Requires JWT — derives user_id from Bearer token, not body params.
//
// POST { code: string }
// Headers: Authorization: Bearer <jwt>
// -> 200 { accepted: true }
// -> 400 { error: 'code is required' }
// -> 401 { error: 'Authorization required' | 'Invalid token' }
// -> 403 { error: 'This invitation was sent to a different email address' }
// -> 404 { error: 'Invalid or already used invitation' }
// -> 410 { error: 'Invitation has expired' }
// -> 429 { error: 'Too many requests' }

import { createClient } from '@supabase/supabase-js'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, captureWebhookError } from '../_shared/errors.ts'
import { rateLimit } from '../_shared/rate-limit.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  // Rate limit: 10 req/min per IP
  const rateLimited = await rateLimit(req, { maxRequests: 10, windowMs: 60_000, prefix: 'invite-accept' })
  if (rateLimited) return rateLimited

  try {
    const env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'],
    })

    // AUTH-04: JWT auth guard — derive user identity from token
    const supabaseAuth = createClient(env['SUPABASE_URL'], env['SUPABASE_ANON_KEY'])
    const auth = await validateBearerAuth(req, supabaseAuth)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: getJsonHeaders(req),
      })
    }
    const { user } = auth

    // Service role client — bypasses RLS for invite acceptance writes
    const supabase = createAdminClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

    const body = await req.json()
    const code: string = body.code

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'code is required' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('tenant_invitations')
      .select('id, email, expires_at, status, lease_id')
      .eq('invitation_code', code)
      .single()

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation' }),
        { status: 404, headers: getJsonHeaders(req) }
      )
    }

    // Email-match guard: prevent user A from accepting user B's invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'This invitation was sent to a different email address' }),
        { status: 403, headers: getJsonHeaders(req) }
      )
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation' }),
        { status: 404, headers: getJsonHeaders(req) }
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: getJsonHeaders(req) }
      )
    }

    // Create tenant record linking this auth user (upsert — handle duplicate user_id gracefully)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: false })
      .select('id')
      .single()

    if (tenantError) {
      return errorResponse(req, 500, tenantError, { action: 'create_tenant_record' })
    }

    // If the invitation has a lease_id, link the tenant to the lease via lease_tenants
    if (invitation.lease_id && tenant?.id) {
      const { error: leaseTenantsError } = await supabase
        .from('lease_tenants')
        .upsert(
          { lease_id: invitation.lease_id, tenant_id: tenant.id, is_primary: true },
          { onConflict: 'lease_id,tenant_id', ignoreDuplicates: true }
        )

      if (leaseTenantsError) {
        // Non-fatal — tenant record created, lease link failed. Log and continue.
        captureWebhookError(leaseTenantsError, { message: 'Failed to link tenant to lease', lease_id: invitation.lease_id, tenant_id: tenant?.id })
      }
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('tenant_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user.id,
      })
      .eq('id', invitation.id)

    if (updateError) {
      return errorResponse(req, 500, updateError, { action: 'mark_invitation_accepted' })
    }

    return new Response(
      JSON.stringify({ accepted: true }),
      { status: 200, headers: getJsonHeaders(req) }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'invitation_accept' })
  }
})
