// Supabase Edge Function: export-report
// Generates CSV, XLSX (CSV-compatible), and PDF (stub) report exports.
// Authenticates via JWT bearer token — no anon access.
// PDF generation is stubbed; StirlingPDF integration is Phase 55.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const reportType = url.searchParams.get('type') ?? 'financial'
    const format = url.searchParams.get('format') ?? 'csv'
    const year = parseInt(url.searchParams.get('year') ?? String(new Date().getFullYear()))

    // PDF generation requires StirlingPDF (Phase 55) — return stub response
    if (format === 'pdf') {
      return new Response(
        JSON.stringify({ error: 'PDF export requires Phase 55 Edge Function (StirlingPDF)' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch data based on report type
    let rows: Record<string, unknown>[] = []
    let filename = `report-${reportType}-${year}`

    if (reportType === 'year-end' || reportType === 'financial') {
      const { data } = await supabase.rpc('get_financial_overview', { p_user_id: user.id })
      rows = flattenToRows(data)
      filename = `year-end-${year}`
    } else if (reportType === '1099') {
      const { data } = await supabase.rpc('get_billing_insights', { owner_id_param: user.id })
      rows = flattenToRows(data)
      filename = `1099-vendors-${year}`
    } else if (reportType === 'maintenance') {
      const { data } = await supabase.rpc('get_maintenance_analytics', { user_id: user.id })
      rows = flattenToRows(data)
      filename = `maintenance-report-${year}`
    } else {
      const { data } = await supabase.rpc('get_revenue_trends_optimized', {
        p_user_id: user.id,
        p_months: 12
      })
      rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
      filename = `revenue-report-${year}`
    }

    const csv = rowsToCsv(rows)

    if (format === 'xlsx') {
      // Full XLSX binary requires a library — ship CSV-compatible content with .xlsx extension
      // Excel opens CSV files natively
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        }
      })
    }

    // Default: CSV
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      }
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function flattenToRows(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  // For object-shaped RPC results, convert to key-value rows
  return Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
    metric: key,
    value: typeof value === 'object' ? JSON.stringify(value) : value
  }))
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'No data available\n'
  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
  ]
  return csvRows.join('\n')
}
