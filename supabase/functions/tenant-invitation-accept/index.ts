// Tenant Invitation Accept Edge Function
// Accepts a tenant invitation after the user has created their Supabase auth account.
// AUTH-04: Requires JWT — derives user_id from Bearer token, not body params.
//
// POST { code: string }
// Headers: Authorization: Bearer <jwt>
// -> 200 { accepted: true }
// -> 400 { error: 'code is required' }
// -> 401 { error: 'Authorization required' | 'Invalid token' }
// -> 404 { error: 'Invalid or already used invitation' }
// -> 410 { error: 'Invitation has expired' }
// -> 429 { error: 'Too many requests' }

import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { rateLimit } from '../_shared/rate-limit.ts'

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // Validate token using a token-scoped client
    const supabaseAuth = createClient(env['SUPABASE_URL'], env['SUPABASE_ANON_KEY'], {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Service role client — bypasses RLS for invite acceptance writes
    const supabase = createClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

    const body = await req.json()
    const code: string = body.code

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'code is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
        console.error('Failed to link tenant to lease:', leaseTenantsError.message)
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
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'invitation_accept' })
  }
})
