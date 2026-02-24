// Tenant Invitation Accept Edge Function
// Accepts a tenant invitation after the user has created their Supabase auth account.
// Unauthenticated — the invitation code plus the auth user ID are the secrets.
//
// POST { code: string, authuser_id: string }
// → 200 { accepted: true }
// → 400 { error: 'code and authuser_id are required' }
// → 404 { error: 'Invalid or already used invitation' }
// → 410 { error: 'Invitation has expired' }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  // Service role client — bypasses RLS for invite acceptance writes
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const code: string = body.code
    const authUserId: string = body.authuser_id

    if (!code || !authUserId) {
      return new Response(
        JSON.stringify({ error: 'code and authuser_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create tenant record linking this auth user (upsert — handle duplicate user_id gracefully)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .upsert({ user_id: authUserId }, { onConflict: 'user_id', ignoreDuplicates: false })
      .select('id')
      .single()

    if (tenantError) {
      return new Response(
        JSON.stringify({ error: `Failed to create tenant record: ${tenantError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        accepted_by_user_id: authUserId,
      })
      .eq('id', invitation.id)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Failed to mark invitation accepted: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ accepted: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
