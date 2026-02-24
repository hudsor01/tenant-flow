// DocuSeal Inbound Webhook Edge Function
// Processes DocuSeal signature events and updates lease status atomically.
// PUBLIC endpoint — no JWT required. Optionally validates DOCUSEAL_WEBHOOK_SECRET header.
// On failure: return 500 so DocuSeal retries.
// On duplicate: return 200 immediately (idempotent via existing timestamp checks).
//
// Events handled:
//   form.completed       — individual party has signed (updates owner_signed_at or tenant_signed_at)
//   submission.completed — all parties signed (flips lease_status to active + inserts notification)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-docuseal-signature',
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface FormCompletedPayload {
  event_type: string
  id: number
  submission_id: number
  role: string
  email: string
  completed_at?: string
  metadata?: { lease_id?: string }
}

interface SubmissionCompletedPayload {
  event_type: string
  id: number
  status: string
  documents?: Array<{ name: string; url: string }>
  completed_at?: string
  metadata?: { lease_id?: string }
}

// -----------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------

async function handleFormCompleted(
  supabase: ReturnType<typeof createClient>,
  body: FormCompletedPayload
): Promise<void> {
  const { submission_id, role, completed_at, metadata } = body

  // 1. Find lease by docuseal_submission_id first, then fallback to metadata.lease_id
  const { data: leaseBySubmission, error: submissionError } = await supabase
    .from('leases')
    .select('id, lease_status, owner_signed_at, tenant_signed_at, owner_user_id')
    .eq('docuseal_submission_id', String(submission_id))
    .maybeSingle()

  if (submissionError) {
    throw new Error(`Database error querying lease by submission_id: ${submissionError.message}`)
  }

  let lease = leaseBySubmission

  // 2. Fallback to metadata.lease_id if not found by submission_id
  if (!lease && metadata?.lease_id) {
    const { data: leaseById, error: leaseIdError } = await supabase
      .from('leases')
      .select('id, lease_status, owner_signed_at, tenant_signed_at, owner_user_id')
      .eq('id', metadata.lease_id)
      .maybeSingle()

    if (leaseIdError) {
      throw new Error(`Database error querying lease by metadata.lease_id: ${leaseIdError.message}`)
    }

    lease = leaseById
  }

  // 3. If lease not found — not our document, ignore gracefully
  if (!lease) {
    console.log(`Lease not found for submission_id=${submission_id} metadata.lease_id=${metadata?.lease_id ?? 'none'} — ignoring`)
    return
  }

  // 4. Determine which party signed based on role
  const isOwner = role.toLowerCase().includes('owner')
  const isTenant = role.toLowerCase().includes('tenant')
  const signedAt = completed_at ?? new Date().toISOString()

  if (isOwner) {
    // Idempotency: already signed — skip
    if (lease.owner_signed_at) {
      console.log(`owner_signed_at already set for lease ${lease.id} — duplicate delivery, skipping`)
      return
    }

    const { error: updateError } = await supabase
      .from('leases')
      .update({
        owner_signed_at: signedAt,
        owner_signature_method: 'docuseal',
      })
      .eq('id', lease.id)

    if (updateError) {
      throw new Error(`Failed to update owner signature: ${updateError.message}`)
    }

    console.log(`Owner signature recorded for lease ${lease.id}`)
  } else if (isTenant) {
    // Idempotency: already signed — skip
    if (lease.tenant_signed_at) {
      console.log(`tenant_signed_at already set for lease ${lease.id} — duplicate delivery, skipping`)
      return
    }

    const { error: updateError } = await supabase
      .from('leases')
      .update({
        tenant_signed_at: signedAt,
        tenant_signature_method: 'docuseal',
      })
      .eq('id', lease.id)

    if (updateError) {
      throw new Error(`Failed to update tenant signature: ${updateError.message}`)
    }

    console.log(`Tenant signature recorded for lease ${lease.id}`)
  } else {
    console.log(`Unrecognised role '${role}' — no signature update performed`)
  }
}

async function handleSubmissionCompleted(
  supabase: ReturnType<typeof createClient>,
  body: SubmissionCompletedPayload
): Promise<void> {
  const { id: submissionId, documents, metadata } = body

  // 1. Find lease by docuseal_submission_id first, then fallback to metadata.lease_id
  const { data: leaseBySubmission, error: submissionError } = await supabase
    .from('leases')
    .select('id, lease_status, owner_user_id')
    .eq('docuseal_submission_id', String(submissionId))
    .maybeSingle()

  if (submissionError) {
    throw new Error(`Database error querying lease by submission_id: ${submissionError.message}`)
  }

  let lease = leaseBySubmission

  // 2. Fallback to metadata.lease_id if not found by submission_id
  if (!lease && metadata?.lease_id) {
    const { data: leaseById, error: leaseIdError } = await supabase
      .from('leases')
      .select('id, lease_status, owner_user_id')
      .eq('id', metadata.lease_id)
      .maybeSingle()

    if (leaseIdError) {
      throw new Error(`Database error querying lease by metadata.lease_id: ${leaseIdError.message}`)
    }

    lease = leaseById
  }

  // 3. If lease not found — not our document, ignore gracefully
  if (!lease) {
    console.log(`Lease not found for submission_id=${submissionId} metadata.lease_id=${metadata?.lease_id ?? 'none'} — ignoring`)
    return
  }

  // 4. Idempotency: already active — skip
  if (lease.lease_status === 'active') {
    console.log(`Lease ${lease.id} is already active — duplicate delivery, skipping`)
    return
  }

  // 5a. Flip lease_status to active (pending_signature → active)
  const { error: leaseUpdateError } = await supabase
    .from('leases')
    .update({ lease_status: 'active' })
    .eq('id', lease.id)

  if (leaseUpdateError) {
    throw new Error(`Failed to activate lease: ${leaseUpdateError.message}`)
  }

  console.log(`Lease ${lease.id} flipped to active`)

  // 5b. Insert owner notification
  // IMPORTANT: notification_type must be 'lease' per notifications_notification_type_check constraint
  // Allowed values: ('maintenance', 'lease', 'payment', 'system')
  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: lease.owner_user_id,
      title: 'Lease fully signed',
      message: 'Your lease has been signed by all parties and is now active.',
      notification_type: 'lease',
    })

  if (notifError) {
    throw new Error(`Failed to insert owner notification: ${notifError.message}`)
  }

  console.log(`Owner notification inserted for lease ${lease.id}`)

  // 5c. Log signed document URL if available (docuseal_document_url column does not exist in DB — skip update)
  const signedDocUrl = documents?.[0]?.url
  if (signedDocUrl) {
    console.log(`Signed document available for lease ${lease.id}: ${signedDocUrl}`)
  }
}

// -----------------------------------------------------------------------
// Main handler
// -----------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify shared secret if configured
  const webhookSecret = Deno.env.get('DOCUSEAL_WEBHOOK_SECRET')
  if (webhookSecret) {
    const signature = req.headers.get('x-docuseal-signature') ?? req.headers.get('authorization')
    if (signature !== webhookSecret && signature !== `Bearer ${webhookSecret}`) {
      return new Response('Invalid signature', { status: 400, headers: corsHeaders })
    }
  } else {
    console.warn('DOCUSEAL_WEBHOOK_SECRET is not set — endpoint is unauthenticated')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const eventType = body.event_type as string

  try {
    if (eventType === 'form.completed') {
      await handleFormCompleted(supabase, body as unknown as FormCompletedPayload)
    } else if (eventType === 'submission.completed') {
      await handleSubmissionCompleted(supabase, body as unknown as SubmissionCompletedPayload)
    } else {
      console.log(`Unhandled DocuSeal event: ${eventType}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    // Return 500 so DocuSeal retries the webhook delivery
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
