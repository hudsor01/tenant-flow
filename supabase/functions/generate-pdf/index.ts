// Supabase Edge Function: generate-pdf
// Accepts either structured report data (reportType + year) or raw HTML,
// calls the self-hosted StirlingPDF k3s instance, and streams the resulting PDF blob.
// JWT-authenticated — requires a valid Bearer token.
// Fail-fast: no retry on StirlingPDF errors (matches stripe-webhooks pattern).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ReportRow = Record<string, string | number | null | undefined>

type RequestBody =
  | { reportType: string; year: number; filename?: string }
  | { html: string; filename?: string }

function buildReportHtml(reportType: string, year: number, rows: ReportRow[]): string {
  const title = `${reportType.replace(/-/g, ' ').toUpperCase()} REPORT — ${year}`
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  const headerCells = headers.map(h => `<th class="th">${h}</th>`).join('')
  const tableRows = rows
    .map(row => `<tr>${headers.map(h => `<td class="td">${row[h] ?? ''}</td>`).join('')}</tr>`)
    .join('')

  const tableMarkup =
    rows.length === 0
      ? '<p class="empty">No data available for this report.</p>'
      : `<table class="table"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
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
  <h1>${title}</h1>
  <p class="meta">Generated: ${new Date().toLocaleDateString()}</p>
  ${tableMarkup}
</body>
</html>`
}

async function fetchReportRows(
  supabase: ReturnType<typeof createClient>,
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const stirlingPdfUrl = Deno.env.get('STIRLING_PDF_URL')

    if (!stirlingPdfUrl) {
      return new Response(
        JSON.stringify({ error: 'STIRLING_PDF_URL environment variable is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json() as RequestBody
    const filename = body.filename ?? 'report.pdf'

    let html: string

    if ('html' in body) {
      // Internal usage: export-report delegates with pre-built HTML
      if (!body.html || typeof body.html !== 'string') {
        return new Response(
          JSON.stringify({ error: 'html field must be a non-empty string' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      html = body.html
    } else {
      // Frontend usage: build HTML server-side from report data
      if (!body.reportType || typeof body.year !== 'number') {
        return new Response(
          JSON.stringify({ error: 'reportType (string) and year (number) are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const rows = await fetchReportRows(supabase, user.id)
      html = buildReportHtml(body.reportType, body.year, rows)
    }

    const formData = new FormData()
    formData.append('htmlContent', html)

    const pdfResponse = await fetch(`${stirlingPdfUrl}/api/v1/misc/html-to-pdf`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    })

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text().catch(() => pdfResponse.statusText)
      return new Response(
        JSON.stringify({ error: `StirlingPDF returned ${pdfResponse.status}: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const pdfBlob = await pdfResponse.arrayBuffer()
    return new Response(pdfBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const isTimeout = message.includes('timed out') || message.includes('TimeoutError')
    return new Response(
      JSON.stringify({ error: isTimeout ? 'StirlingPDF request timed out (30s)' : message }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
