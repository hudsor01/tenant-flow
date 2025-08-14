'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { AuthHealthStatus } from '@/lib/auth/auth-health-check'

/**
 * Visual auth system status page
 * Shows real-time health of all auth subsystems
 */
export function AuthStatusPage() {
  const [status, setStatus] = useState<AuthHealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/health')
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      setStatus(data)
      setLastCheck(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auth status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warn':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getOverallStatusColor = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Checking auth system status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            onClick={fetchStatus} 
            variant="link" 
            className="ml-2 p-0 h-auto"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!status) {
    return null
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auth System Status</h1>
          <p className="text-gray-600 mt-1">
            Real-time health monitoring of authentication systems
          </p>
        </div>
        <Button
          onClick={fetchStatus}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                {status.environment === 'production' ? 'Production' : 'Development'} Environment
              </CardDescription>
            </div>
            <div className={`px-4 py-2 rounded-full border ${getOverallStatusColor(status.overall)}`}>
              <span className="font-semibold uppercase">{status.overall}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            Last checked: {lastCheck?.toLocaleString() || 'Never'}
          </div>
        </CardContent>
      </Card>

      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(status.checks).map(([name, check]) => (
          <Card key={name} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </CardTitle>
                {getStatusIcon(check.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{check.message}</p>
              {check.details && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    View details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(check.details, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      {status.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Suggested actions to improve auth system health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {status.recommendations.map((rec, index) => (
                <li key={index} className="text-sm">
                  {rec.startsWith('   ') ? (
                    <span className="ml-6 text-gray-600">{rec}</span>
                  ) : (
                    <span className={rec.startsWith('✅') ? 'text-green-700' : ''}>
                      {rec}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh indicator */}
      <div className="text-center text-sm text-gray-500">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}