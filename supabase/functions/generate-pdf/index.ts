// Supabase Edge Function: generate-pdf
// Accepts three request modes:
//   1. { reportType, year }   — server-side report data fetch + HTML build
//   2. { html }               — pre-built HTML from caller (no DB fetch)
//   3. { leaseId }            — fetch lease+property data, build HTML summary
// Calls the self-hosted StirlingPDF k3s instance and streams the resulting PDF blob.
// JWT-authenticated — requires a valid Bearer token.
// Fail-fast: no retry on StirlingPDF errors (matches stripe-webhooks pattern).

import type { SupabaseClient } from '@supabase/supabase-js'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { errorResponse, captureWebhookError } from '../_shared/errors.ts'
import { escapeHtml } from '../_shared/escape-html.ts'
import { validateEnv } from '../_shared/env.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

type ReportRow = Record<string, string | number | null | undefined>

type RequestBody =
  | { reportType: string; year: number; filename?: string }
  | { html: string; filename?: string }
  | { leaseId: string; filename?: string }

function buildReportHtml(reportType: string, year: number, rows: ReportRow[]): string {
  const title = `${reportType.replace(/-/g, ' ').toUpperCase()} REPORT — ${year}`
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  const headerCells = headers.map(h => `<th class="th">${escapeHtml(h)}</th>`).join('')
  const tableRows = rows
    .map(row => `<tr>${headers.map(h => `<td class="td">${escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`)
    .join('')

  const tableMarkup =
    rows.length === 0
      ? '<p class="empty">No data available for this report.</p>'
      : `<table class="table"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #222; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 16px; font-size: 13px; }
    .table { border-collapse: collapse; width: 100%; font-size: 13px; }
    .th { border: 1px solid #ccc; padding: 6px 10px; background: #f0f0f0; text-align: left; }
    .td { border: 1px solid #ccc; padding: 6px 10px; }
    .empty { color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleDateString())}</p>
  ${tableMarkup}
</body>
</html>`
}

async function fetchReportRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReportRow[]> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: userId })
  if (error) throw new Error(`Failed to fetch report data: ${error.message}`)
  const stats = (data as Record<string, unknown>[] | null)?.[0] ?? {}
  return Object.entries(stats).map(([key, value]) => ({
    metric: key,
    value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? ''),
  }))
}

async function buildLeasePreviewHtml(
  supabase: SupabaseClient,
  leaseId: string,
): Promise<string> {
  const { data: lease, error } = await supabase
    .from('leases')
    .select(`
      id,
      lease_status,
      start_date,
      end_date,
      rent_amount,
      security_deposit,
      owner_user_id,
      primary_tenant_id,
      units ( unit_number, properties ( name, address_line1, city, state, postal_code ) )
    `)
    .eq('id', leaseId)
    .single()

  if (error || !lease) {
    throw new Error(`Lease not found: ${leaseId}`)
  }

  // Safely access joined data (PostgREST returns arrays for joined tables)
  const unit = Array.isArray(lease.units) ? lease.units[0] : lease.units
  const property = unit && (Array.isArray(unit.properties) ? unit.properties[0] : unit.properties)
  const propertyName = property?.name ?? 'Unknown Property'
  const propertyAddress = property
    ? `${property.address_line1 ?? ''}, ${property.city ?? ''}, ${property.state ?? ''} ${property.postal_code ?? ''}`.trim()
    : 'Address not available'
  const unitNumber = unit?.unit_number ?? ''
  const rentAmount = lease.rent_amount != null
    ? `$${Number(lease.rent_amount).toLocaleString()}/month`
    : 'N/A'
  const deposit = lease.security_deposit != null
    ? `$${Number(lease.security_deposit).toLocaleString()}`
    : 'N/A'
  const startDate = lease.start_date ?? 'N/A'
  const endDate = lease.end_date ?? 'N/A'
  const status = lease.lease_status ?? 'N/A'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lease Preview</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #222; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; margin-bottom: 16px; }
    .label { border: 1px solid #ccc; padding: 6px 10px; font-weight: 500; background: #f8f8f8; width: 40%; }
    .value { border: 1px solid #ccc; padding: 6px 10px; }
    .note { color: #888; font-size: 11px; }
  </style>
</head>
<body>
  <h1>Lease Agreement Preview</h1>
  <p class="meta">Generated: ${escapeHtml(new Date().toLocaleDateString())}</p>
  <table>
    <tbody>
      <tr><td class="label">Property</td><td class="value">${escapeHtml(propertyName)}</td></tr>
      <tr><td class="label">Address</td><td class="value">${escapeHtml(propertyAddress)}</td></tr>
      ${unitNumber ? `<tr><td class="label">Unit</td><td class="value">${escapeHtml(unitNumber)}</td></tr>` : ''}
      <tr><td class="label">Start Date</td><td class="value">${escapeHtml(startDate)}</td></tr>
      <tr><td class="label">End Date</td><td class="value">${escapeHtml(endDate)}</td></tr>
      <tr><td class="label">Monthly Rent</td><td class="value">${escapeHtml(rentAmount)}</td></tr>
      <tr><td class="label">Security Deposit</td><td class="value">${escapeHtml(deposit)}</td></tr>
      <tr><td class="label">Status</td><td class="value">${escapeHtml(status)}</td></tr>
    </tbody>
  </table>
  <p class="note">This is a preview document. The final signed lease agreement may differ.</p>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  try {
    const env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STIRLING_PDF_URL'],
    })

    const supabase = createAdminClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

    const auth = await validateBearerAuth(req, supabase)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: getJsonHeaders(req),
      })
    }
    const { user } = auth

    const body = await req.json() as RequestBody
    const filename = body.filename ?? 'report.pdf'

    let html: string

    if ('html' in body) {
      // Mode 2: pre-built HTML from caller (export-report or frontend component)
      if (!body.html || typeof body.html !== 'string') {
        return new Response(
          JSON.stringify({ error: 'html field must be a non-empty string' }),
          { status: 400, headers: getJsonHeaders(req) },
        )
      }
      html = body.html
    } else if ('leaseId' in body) {
      // Mode 3: lease PDF preview — fetch lease data and build HTML summary
      if (!body.leaseId || typeof body.leaseId !== 'string') {
        return new Response(
          JSON.stringify({ error: 'leaseId must be a non-empty string' }),
          { status: 400, headers: getJsonHeaders(req) },
        )
      }

      // Verify ownership before generating PDF
      const { data: leaseOwnership, error: ownershipError } = await supabase
        .from('leases')
        .select('owner_user_id')
        .eq('id', body.leaseId)
        .maybeSingle()

      if (ownershipError || !leaseOwnership || leaseOwnership.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: getJsonHeaders(req) },
        )
      }

      html = await buildLeasePreviewHtml(supabase, body.leaseId)
    } else {
      // Mode 1: structured report data — fetch DB data and build HTML
      if (!body.reportType || typeof body.year !== 'number') {
        return new Response(
          JSON.stringify({ error: 'reportType (string) and year (number) are required' }),
          { status: 400, headers: getJsonHeaders(req) },
        )
      }
      const rows = await fetchReportRows(supabase, user.id)
      html = buildReportHtml(body.reportType, body.year, rows)
    }

    const formData = new FormData()
    formData.append('htmlContent', html)

    const stirlingPdfUrl = env['STIRLING_PDF_URL']
    const pdfResponse = await fetch(`${stirlingPdfUrl}/api/v1/misc/html-to-pdf`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    })

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text().catch(() => pdfResponse.statusText)
      captureWebhookError(new Error('StirlingPDF non-OK response'), { message: 'StirlingPDF non-OK response', status: pdfResponse.status, err_text: errorText })
      return errorResponse(req, 502, new Error('PDF generation failed'), { action: 'generate_pdf' })
    }

    const pdfBlob = await pdfResponse.arrayBuffer()
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isTimeout = message.includes('timed out') || message.includes('TimeoutError')
    if (isTimeout) {
      return new Response(
        JSON.stringify({ error: 'PDF generation timed out' }),
        { status: 504, headers: getJsonHeaders(req) },
      )
    }
    return errorResponse(req, 500, err, { action: 'generate_pdf' })
  }
})
