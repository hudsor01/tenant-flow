/**
 * Simple metrics endpoint
 * Provides basic metrics in Prometheus format
 */
export async function GET() {
  try {
    const timestamp = Date.now()
    const environment = process.env.NODE_ENV || 'unknown'
    
    // Simple health check
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const healthStatus = hasSupabaseUrl && hasSupabaseKey ? 2 : 0 // 2=healthy, 0=unhealthy
    
    const metrics = `
# HELP tenantflow_auth_health_status Auth system health status (0=unhealthy, 2=healthy)
# TYPE tenantflow_auth_health_status gauge
tenantflow_auth_health_status{environment="${environment}"} ${healthStatus} ${timestamp}

# HELP tenantflow_app_info Application information
# TYPE tenantflow_app_info gauge
tenantflow_app_info{version="1.0.0",environment="${environment}"} 1 ${timestamp}

# HELP tenantflow_config_status Configuration status
# TYPE tenantflow_config_status gauge
tenantflow_config_status{config="supabase_url",environment="${environment}"} ${hasSupabaseUrl ? 1 : 0} ${timestamp}
tenantflow_config_status{config="supabase_key",environment="${environment}"} ${hasSupabaseKey ? 1 : 0} ${timestamp}
`.trim()
    
    return new Response(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch {
    const errorMetrics = `
# HELP tenantflow_metrics_error Metrics generation error
# TYPE tenantflow_metrics_error gauge
tenantflow_metrics_error 1
`
    
    return new Response(errorMetrics, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    })
  }
}