// Send Tenant Invitation Edge Function
// Sends a branded invitation email via Resend when called by the invitation owner.
// Authenticated — requires JWT from the owner who created the invitation.
//
// POST { invitation_id: string }
// Headers: Authorization: Bearer <jwt>
// -> 200 { sent: true, email_id: string }
// -> 400 { error: 'invitation_id is required' | 'Invitation is no longer active' }
// -> 401 { error: 'Authorization required' | 'Invalid token' }
// -> 403 { error: 'Not authorized' }
// -> 404 { error: 'Invitation not found' }
// -> 410 { error: 'Invitation has expired' }

import { createClient } from '@supabase/supabase-js'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { tenantInvitationEmail } from '../_shared/auth-email-templates.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  try {
    const env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'RESEND_API_KEY'],
      optional: ['NEXT_PUBLIC_APP_URL'],
    })

    // JWT auth guard -- derive user identity from token
    const supabaseAuth = createClient(env['SUPABASE_URL'], env['SUPABASE_ANON_KEY'])
    const auth = await validateBearerAuth(req, supabaseAuth)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: getJsonHeaders(req),
      })
    }
    const { user } = auth

    // Service role client -- bypasses RLS for invitation lookup
    const supabase = createAdminClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

    // Parse and validate request body
    const body = await req.json()
    const invitationId: string = body.invitation_id

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: 'invitation_id is required' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    // Fetch invitation with joined owner/property/unit details
    const { data: invitation, error: fetchError } = await supabase
      .from('tenant_invitations')
      .select(`
        id,
        email,
        invitation_code,
        invitation_url,
        expires_at,
        status,
        owner_user_id,
        users!tenant_invitations_owner_user_id_fkey(full_name),
        properties(name),
        units(unit_number)
      `)
      .eq('id', invitationId)
      .single()

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: getJsonHeaders(req) }
      )
    }

    // Authorization: only the owner who created the invitation can send the email
    if (invitation.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: getJsonHeaders(req) }
      )
    }

    // Check invitation is still active
    if (invitation.status === 'accepted' || invitation.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Invitation is no longer active' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: getJsonHeaders(req) }
      )
    }

    // Resolve joined fields (PostgREST may return arrays for joins)
    const owner = Array.isArray(invitation.users)
      ? invitation.users[0]
      : invitation.users
    const property = Array.isArray(invitation.properties)
      ? invitation.properties[0]
      : invitation.properties
    const unit = Array.isArray(invitation.units)
      ? invitation.units[0]
      : invitation.units

    const ownerName = (owner as { full_name?: string } | null)?.full_name ?? 'Your property manager'
    const propertyName = (property as { name?: string } | null)?.name ?? undefined
    const unitNumber = (unit as { unit_number?: string } | null)?.unit_number ?? undefined

    // Build accept URL
    const appUrl = env['NEXT_PUBLIC_APP_URL'] ?? Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3050'
    const acceptUrl = invitation.invitation_url
      ? String(invitation.invitation_url)
      : `${appUrl}/accept-invite?code=${invitation.invitation_code}`

    // Render branded email template
    const template = tenantInvitationEmail({
      acceptUrl,
      tenantEmail: invitation.email,
      ownerName,
      propertyName,
      unitNumber,
    })

    // Send via Resend
    const result = await sendEmail({
      to: [invitation.email],
      subject: template.subject,
      html: template.html,
      tags: [
        { name: 'category', value: 'tenant-invitation' },
        { name: 'invitation_id', value: invitationId },
      ],
    })

    if (!result.success) {
      return errorResponse(req, 500, new Error(result.error), { action: 'send_tenant_invitation_email' })
    }

    return new Response(
      JSON.stringify({ sent: true, email_id: result.id }),
      { status: 200, headers: getJsonHeaders(req) }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'send_tenant_invitation' })
  }
})
