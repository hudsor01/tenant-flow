// Supabase Edge Function: docuseal
// Handles outbound DocuSeal API calls for lease e-signature workflows.
// JWT-authenticated — requires a valid Bearer token (not public).
// Fail-fast: no retry on DocuSeal errors (matches stripe-webhooks pattern).
//
// Actions:
//   send-for-signature — generate PDF and create DocuSeal submission
//   sign-owner         — record owner signature in DB
//   sign-tenant        — record tenant signature in DB (flips lease active if both signed)
//   cancel             — archive DocuSeal submission and reset lease to draft
//   resend             — resend pending signature request emails

import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { errorResponse, captureWebhookError } from '../_shared/errors.ts'
import { escapeHtml } from '../_shared/escape-html.ts'
import { validateEnv } from '../_shared/env.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  try {
    const env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DOCUSEAL_URL', 'DOCUSEAL_API_KEY'],
      optional: ['FRONTEND_URL'],
    })

    // Authenticate via Bearer token
    const supabaseUrl = env['SUPABASE_URL']
    const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY']
    const docusealUrl = env['DOCUSEAL_URL']
    const docusealApiKey = env['DOCUSEAL_API_KEY']

    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)

    const auth = await validateBearerAuth(req, supabase)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: getJsonHeaders(req),
      })
    }
    const { user } = auth

    // Parse action from request body
    const body = await req.json() as Record<string, unknown>
    const action = body.action as string

    // -----------------------------------------------------------------------
    // action: 'send-for-signature'
    // Generates a PDF via the generate-pdf Edge Function, base64-encodes it,
    // and submits it to DocuSeal with owner + tenant as signatories.
    // -----------------------------------------------------------------------
    if (action === 'send-for-signature') {
      const leaseId = body.leaseId as string
      const message = body.message as string | undefined
      const missingFields = body.missingFields as {
        immediate_family_members: string
        landlord_notice_address: string
      } | undefined

      if (!leaseId) {
        return new Response(
          JSON.stringify({ error: 'leaseId is required' }),
          { status: 400, headers: getJsonHeaders(req) }
        )
      }

      // 1. Fetch lease details
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, owner_user_id, primary_tenant_id, start_date, end_date, rent_amount, unit_id')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      // Ownership check: only the lease owner can send for signature
      if (lease.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      // 2-4. Fetch owner, tenant, and unit+property in parallel (all depend on lease, not each other)
      const [
        { data: ownerProfile },
        { data: tenantRow },
        { data: unitRow },
      ] = await Promise.all([
        supabase.from('users').select('full_name, email').eq('id', lease.owner_user_id).single(),
        supabase.from('tenants').select('user_id, users!inner(first_name, last_name, email)').eq('id', lease.primary_tenant_id).single(),
        supabase.from('units').select('unit_number, properties(name, address_line1, city, state, postal_code)').eq('id', lease.unit_id).single(),
      ])

      const ownerName = (ownerProfile?.full_name as string | null) ?? 'Property Owner'
      const ownerEmail = (ownerProfile?.email as string | null) ?? ''

      const tenantUser = tenantRow?.users as unknown as { first_name: string | null; last_name: string | null; email: string } | null
      const tenantName = tenantUser
        ? `${tenantUser.first_name ?? ''} ${tenantUser.last_name ?? ''}`.trim()
        : 'Tenant'
      const tenantEmail = tenantUser?.email ?? ''

      const property = unitRow
        ? (unitRow.properties as unknown as {
            name: string | null
            address_line1: string | null
            city: string | null
            state: string | null
            postal_code: string | null
          } | null)
        : null

      const propertyAddress = property
        ? [
            property.name,
            property.address_line1,
            [property.city, property.state, property.postal_code].filter(Boolean).join(', ')
          ]
            .filter(Boolean)
            .join(' — ')
        : 'Property address unavailable'

      const unitNumber = (unitRow?.unit_number as string | null) ?? ''

      // 5. Build minimal HTML for PDF generation
      const startDate = lease.start_date ? new Date(lease.start_date as string).toLocaleDateString('en-US') : 'N/A'
      const endDate = lease.end_date ? new Date(lease.end_date as string).toLocaleDateString('en-US') : 'N/A'
      const rentAmount = typeof lease.rent_amount === 'number'
        ? `$${(lease.rent_amount as number).toFixed(2)}`
        : 'N/A'

      const leaseHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; line-height: 1.6; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 6px 8px; vertical-align: top; }
    td:first-child { font-weight: bold; width: 40%; }
    .signature-block { margin-top: 40px; display: flex; gap: 60px; }
    .sig { flex: 1; }
    .sig-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>RESIDENTIAL LEASE AGREEMENT</h1>
  <h2>Property Details</h2>
  <table>
    <tr><td>Property Address</td><td>${escapeHtml(propertyAddress)}</td></tr>
    ${unitNumber ? `<tr><td>Unit Number</td><td>${escapeHtml(unitNumber)}</td></tr>` : ''}
  </table>
  <h2>Lease Terms</h2>
  <table>
    <tr><td>Lease Start Date</td><td>${escapeHtml(startDate)}</td></tr>
    <tr><td>Lease End Date</td><td>${escapeHtml(endDate)}</td></tr>
    <tr><td>Monthly Rent Amount</td><td>${escapeHtml(rentAmount)}</td></tr>
  </table>
  <h2>Parties</h2>
  <table>
    <tr><td>Property Owner / Landlord</td><td>${escapeHtml(ownerName)}</td></tr>
    <tr><td>Tenant</td><td>${escapeHtml(tenantName)}</td></tr>
  </table>
  ${missingFields ? `
  <h2>Additional Terms</h2>
  <table>
    ${missingFields.landlord_notice_address ? `<tr><td>Landlord Notice Address</td><td>${escapeHtml(missingFields.landlord_notice_address)}</td></tr>` : ''}
    ${missingFields.immediate_family_members ? `<tr><td>Immediate Family Members</td><td>${escapeHtml(missingFields.immediate_family_members)}</td></tr>` : ''}
  </table>` : ''}
  <h2>Signatures</h2>
  <div class="signature-block">
    <div class="sig">
      <div class="sig-line">Property Owner: ${escapeHtml(ownerName)}</div>
    </div>
    <div class="sig">
      <div class="sig-line">Tenant: ${escapeHtml(tenantName)}</div>
    </div>
  </div>
</body>
</html>`

      // 6. Call generate-pdf Edge Function (server-to-server with service role key)
      const pdfResponse = await fetch(
        `${supabaseUrl}/functions/v1/generate-pdf`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ html: leaseHtml, filename: 'lease-agreement.pdf' }),
        }
      )

      if (!pdfResponse.ok) {
        const errText = await pdfResponse.text().catch(() => pdfResponse.statusText)
        captureWebhookError(new Error('PDF generation failed'), { message: 'PDF generation failed', err_text: errText, action: 'send-for-signature', lease_id: leaseId })
        return errorResponse(req, 502, new Error('PDF generation failed'), { action: 'send-for-signature' })
      }

      // 7. Base64-encode the PDF (chunked to avoid call stack limits on large files)
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const uint8 = new Uint8Array(pdfBuffer)
      const CHUNK = 8192
      let binary = ''
      for (let i = 0; i < uint8.length; i += CHUNK) {
        binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK))
      }
      const base64Pdf = btoa(binary)

      // 8. Build DocuSeal submitters array
      const ownerSubmitter: Record<string, unknown> = {
        role: 'Property Owner',
        email: ownerEmail,
        name: ownerName,
        order: 1,
      }
      const tenantSubmitter: Record<string, unknown> = {
        role: 'Tenant',
        email: tenantEmail,
        name: tenantName,
        order: 2,
      }
      if (message) {
        ownerSubmitter.message = message
        tenantSubmitter.message = message
      }

      // 9. POST to DocuSeal /api/submissions with embedded document
      const docusealPayload = {
        documents: [
          {
            name: 'Lease Agreement',
            file: `data:application/pdf;base64,${base64Pdf}`,
          },
        ],
        submitters: [ownerSubmitter, tenantSubmitter],
        send_email: true,
        order: 'preserved',
        metadata: {
          lease_id: leaseId,
          source: 'tenantflow',
        },
      }

      const submissionResponse = await fetch(`${docusealUrl}/api/submissions`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': docusealApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docusealPayload),
      })

      if (!submissionResponse.ok) {
        const errBody = await submissionResponse.text().catch(() => submissionResponse.statusText)
        captureWebhookError(new Error('DocuSeal submission failed'), { message: 'DocuSeal submission failed', err_body: errBody, action: 'send-for-signature', lease_id: leaseId })
        return errorResponse(req, 502, new Error('DocuSeal submission failed'), { action: 'send-for-signature' })
      }

      const submission = await submissionResponse.json() as { id: number }

      // 10. Update lease with submission ID and sent timestamp
      const { error: updateError } = await supabase
        .from('leases')
        .update({
          docuseal_submission_id: String(submission.id),
          sent_for_signature_at: new Date().toISOString(),
        })
        .eq('id', leaseId)

      if (updateError) {
        return errorResponse(req, 500, updateError, { action: 'update_lease_submission' })
      }

      return new Response(
        JSON.stringify({ success: true, submission_id: submission.id }),
        { status: 200, headers: getJsonHeaders(req) }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'sign-owner'
    // Records owner signature timestamp in the leases table.
    // -----------------------------------------------------------------------
    if (action === 'sign-owner') {
      const leaseId = body.leaseId as string

      if (!leaseId) {
        return new Response(
          JSON.stringify({ error: 'leaseId is required' }),
          { status: 400, headers: getJsonHeaders(req) }
        )
      }

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, owner_user_id, docuseal_submission_id, tenant_signed_at')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      // Ownership check: only the lease owner can sign as owner
      if (lease.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      const updatePayload: Record<string, unknown> = {
        owner_signed_at: new Date().toISOString(),
        owner_signature_method: 'docuseal',
      }

      // If tenant already signed, flip lease to active
      if (lease.tenant_signed_at) {
        updatePayload.lease_status = 'active'
      }

      const { error: updateError } = await supabase
        .from('leases')
        .update(updatePayload)
        .eq('id', leaseId)

      if (updateError) {
        return errorResponse(req, 500, updateError, { action: 'sign_owner' })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: getJsonHeaders(req) }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'sign-tenant'
    // Records tenant signature timestamp in the leases table.
    // Flips lease to active if both parties have now signed.
    // -----------------------------------------------------------------------
    if (action === 'sign-tenant') {
      const leaseId = body.leaseId as string

      if (!leaseId) {
        return new Response(
          JSON.stringify({ error: 'leaseId is required' }),
          { status: 400, headers: getJsonHeaders(req) }
        )
      }

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, owner_user_id, primary_tenant_id, docuseal_submission_id, owner_signed_at')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      // Authorization: allow owner or the lease's primary tenant
      const { data: tenantRecord } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const isTenant = tenantRecord?.id === lease.primary_tenant_id
      const isOwner = lease.owner_user_id === user.id

      if (!isOwner && !isTenant) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      const updatePayload: Record<string, unknown> = {
        tenant_signed_at: new Date().toISOString(),
        tenant_signature_method: 'docuseal',
      }

      // If owner already signed, flip lease to active
      if (lease.owner_signed_at) {
        updatePayload.lease_status = 'active'
      }

      const { error: updateError } = await supabase
        .from('leases')
        .update(updatePayload)
        .eq('id', leaseId)

      if (updateError) {
        return errorResponse(req, 500, updateError, { action: 'sign_tenant' })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: getJsonHeaders(req) }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'cancel'
    // Archives the DocuSeal submission and resets the lease to draft.
    // -----------------------------------------------------------------------
    if (action === 'cancel') {
      const leaseId = body.leaseId as string

      if (!leaseId) {
        return new Response(
          JSON.stringify({ error: 'leaseId is required' }),
          { status: 400, headers: getJsonHeaders(req) }
        )
      }

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, owner_user_id, docuseal_submission_id')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      // Ownership check: only the lease owner can cancel
      if (lease.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      const submissionId = lease.docuseal_submission_id as string | null

      // Archive DocuSeal submission if one exists
      if (submissionId) {
        const archiveResponse = await fetch(
          `${docusealUrl}/api/submissions/${submissionId}/archive`,
          {
            method: 'POST',
            headers: {
              'X-Auth-Token': docusealApiKey,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!archiveResponse.ok) {
          const errBody = await archiveResponse.text().catch(() => archiveResponse.statusText)
          captureWebhookError(new Error('DocuSeal archive failed'), { message: 'DocuSeal archive failed', err_body: errBody, action: 'cancel', lease_id: leaseId })
          return errorResponse(req, 502, new Error('DocuSeal archive failed'), { action: 'cancel' })
        }
      }

      // Reset lease to draft state
      const { error: updateError } = await supabase
        .from('leases')
        .update({
          docuseal_submission_id: null,
          sent_for_signature_at: null,
          lease_status: 'draft',
        })
        .eq('id', leaseId)

      if (updateError) {
        return errorResponse(req, 500, updateError, { action: 'cancel_lease_reset' })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: getJsonHeaders(req) }
      )
    }

    // -----------------------------------------------------------------------
    // action: 'resend'
    // Resends signature request emails to pending submitters via DocuSeal PUT.
    // -----------------------------------------------------------------------
    if (action === 'resend') {
      const leaseId = body.leaseId as string
      const message = body.message as string | undefined

      if (!leaseId) {
        return new Response(
          JSON.stringify({ error: 'leaseId is required' }),
          { status: 400, headers: getJsonHeaders(req) }
        )
      }

      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, owner_user_id, docuseal_submission_id')
        .eq('id', leaseId)
        .single()

      if (leaseError || !lease || !lease.docuseal_submission_id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      // Ownership check: only the lease owner can resend
      if (lease.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) }
        )
      }

      const dsSubmissionId = lease.docuseal_submission_id as string

      // Fetch submitters to find pending ones
      const submittersResponse = await fetch(
        `${docusealUrl}/api/submitters?submission_id=${dsSubmissionId}`,
        {
          method: 'GET',
          headers: {
            'X-Auth-Token': docusealApiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!submittersResponse.ok) {
        const errBody = await submittersResponse.text().catch(() => submittersResponse.statusText)
        captureWebhookError(new Error('Failed to fetch submitters'), { message: 'Failed to fetch submitters', err_body: errBody, action: 'resend', lease_id: leaseId })
        return errorResponse(req, 502, new Error('Failed to fetch submitters'), { action: 'resend' })
      }

      const submittersData = await submittersResponse.json() as {
        data: Array<{ id: number; status: string }>
      }

      const submitters = submittersData.data ?? []
      const pendingSubmitters = submitters.filter(
        (s: { id: number; status: string }) => s.status !== 'completed'
      )

      // Resend to all pending submitters in parallel
      const resendPayload: Record<string, unknown> = { send_email: true }
      if (message) resendPayload.message = message

      const resendResults = await Promise.all(
        pendingSubmitters.map(async (submitter: { id: number; status: string }) => {
          const response = await fetch(
            `${docusealUrl}/api/submitters/${submitter.id}`,
            {
              method: 'PUT',
              headers: {
                'X-Auth-Token': docusealApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(resendPayload),
            }
          )
          if (!response.ok) {
            return { ok: false, id: submitter.id }
          }
          return { ok: true, id: submitter.id }
        })
      )

      const failed = resendResults.find(r => !r.ok)
      if (failed) {
        return errorResponse(req, 502, new Error('Failed to resend signature request'), { action: 'resend', submitterId: failed.id })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: getJsonHeaders(req) }
      )
    }

    // Unknown action — sanitized (don't echo user input)
    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: getJsonHeaders(req) }
    )
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'docuseal' })
  }
})
