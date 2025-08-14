// import { NextResponse } from 'next/server' // Unused
import { authHealthChecker } from '@/lib/auth/auth-health-check'

/**
 * Prometheus metrics endpoint
 * Provides metrics in Prometheus format for scraping
 */
export async function GET() {
  try {
    // Run health check to get current status
    const health = await authHealthChecker.runHealthCheck()
    
    // Generate Prometheus metrics
    const metrics = generatePrometheusMetrics(health)
    
    return new Response(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Failed to generate metrics:', error)
    
    // Return basic error metric
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

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail'
  message?: string
}

interface HealthData {
  environment?: string
  overall?: string
  checks?: Record<string, HealthCheck>
  recommendations?: string[]
}

function generatePrometheusMetrics(health: HealthData): string {
  const timestamp = Date.now()
  
  const environment = health?.environment || 'unknown'
  const overall = health?.overall || 'unknown'
  const checks = health?.checks || {}
  const recommendations = health?.recommendations || []
  
  return `
# HELP tenantflow_auth_health_status Auth system health status (0=unhealthy, 1=degraded, 2=healthy)
# TYPE tenantflow_auth_health_status gauge
tenantflow_auth_health_status{environment="${environment}"} ${
  overall === 'healthy' ? 2 : 
  overall === 'degraded' ? 1 : 0
} ${timestamp}

# HELP tenantflow_auth_checks Auth subsystem check results (0=fail, 1=warn, 2=pass)  
# TYPE tenantflow_auth_checks gauge
${Object.entries(checks).map(([name, check]) => 
  `tenantflow_auth_checks{check="${name}",environment="${environment}"} ${
    check?.status === 'pass' ? 2 : 
    check?.status === 'warn' ? 1 : 0
  } ${timestamp}`
).join('\n')}

# HELP tenantflow_app_info Application information
# TYPE tenantflow_app_info gauge
tenantflow_app_info{version="1.0.0",environment="${environment}"} 1 ${timestamp}

# HELP tenantflow_last_health_check_timestamp Last health check timestamp
# TYPE tenantflow_last_health_check_timestamp gauge
tenantflow_last_health_check_timestamp ${timestamp}

# HELP tenantflow_recommendations_count Number of recommendations
# TYPE tenantflow_recommendations_count gauge
tenantflow_recommendations_count{environment="${environment}"} ${recommendations.length} ${timestamp}
`.trim()
}