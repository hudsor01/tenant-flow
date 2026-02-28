// Tenant Invitation Validate Edge Function
// Validates a tenant invitation code before the user creates their account.
// Unauthenticated — the invitation code itself is the secret.
//
// POST { code: string }
// → 200 { valid: true, email, expires_at, property_owner_name?, property_name?, unit_number? }
// → 404 { error: 'Invalid or already used invitation' }
// → 410 { error: 'Invitation has expired' }

import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const code: string = body.code

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'code is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Look up invitation and join property/unit/owner details
    const { data: invitation, error } = await supabase
      .from('tenant_invitations')
      .select(`
        id,
        email,
        expires_at,
        status,
        properties(name),
        units(unit_number),
        users!tenant_invitations_owner_user_id_fkey(full_name)
      `)
      .eq('invitation_code', code)
      .single()

    if (error || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Already accepted
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Resolve joined fields (PostgREST returns arrays for !inner joins)
    const property = Array.isArray(invitation.properties)
      ? invitation.properties[0]
      : invitation.properties
    const unit = Array.isArray(invitation.units)
      ? invitation.units[0]
      : invitation.units
    const owner = Array.isArray(invitation.users)
      ? invitation.users[0]
      : invitation.users

    return new Response(
      JSON.stringify({
        valid: true,
        email: invitation.email,
        expires_at: invitation.expires_at,
        property_owner_name: (owner as { full_name?: string } | null)?.full_name ?? undefined,
        property_name: (property as { name?: string } | null)?.name ?? undefined,
        unit_number: (unit as { unit_number?: string } | null)?.unit_number ?? undefined,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
})
