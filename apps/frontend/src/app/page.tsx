"use client"

import { NumberTicker } from '@/components/magicui/number-ticker'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalProperties: number
  totalUnits: number
  totalTenants: number
  totalRevenue: number
  occupancyRate: number
  maintenanceRequests: number
}

export default function SimpleHomePage() {
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('http://localhost:4600/api/v1/dashboard/stats')
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('API Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading TenantFlow...</h1>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          TenantFlow Dashboard Stats Test
        </h1>
        
        {isLoading && (
          <p className="text-center">Loading dashboard stats...</p>
        )}
        
        {error && (
          <p className="text-center text-red-500">
            Error: {error}
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="bg-card p-6 rounded-lg border text-center">
            <h2 className="text-lg font-semibold mb-2">Properties</h2>
            <div className="text-3xl font-bold">
              <NumberTicker value={stats?.totalProperties || 50000} />
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border text-center">
            <h2 className="text-lg font-semibold mb-2">Tenants</h2>
            <div className="text-3xl font-bold">
              <NumberTicker value={stats?.totalTenants || 125000} />
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border text-center">
            <h2 className="text-lg font-semibold mb-2">Occupancy Rate</h2>
            <div className="text-3xl font-bold">
              <NumberTicker value={Math.round(stats?.occupancyRate || 98)} />%
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Raw API Response:</h3>
          <pre className="text-sm">
            {JSON.stringify(stats, null, 2) || 'No data'}
          </pre>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            API Status: {isLoading ? 'Loading...' : error ? 'Error' : stats ? 'Success' : 'No Data'}
          </p>
        </div>
      </div>
    </div>
  )
}