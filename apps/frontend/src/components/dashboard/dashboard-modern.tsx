'use client'

/**
 * Modern Dashboard - React 19 + Next.js 15 Patterns
 * Uses native Suspense, use() hook, and Server Components
 */

import { Suspense } from 'react'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { useProperties } from '@/hooks/api/use-properties'
import type { DashboardStats, Property } from '@repo/shared'

/**
 * Dashboard Stats Component - Uses React 19 use() hook
 * Automatically suspends during data loading
 */
function DashboardStatsContent() {
  const { data: stats } = useDashboardOverview()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 space-fluid-sm">
      <div className="card text-center">
        <div className="text-2xl font-bold text-brand-500">
          {stats.totalProperties || 0}
        </div>
        <div className="text-neutral-600">Total Properties</div>
      </div>
      
      <div className="card text-center">
        <div className="text-2xl font-bold text-success">
          {stats.totalTenants || 0}
        </div>
        <div className="text-neutral-600">Active Tenants</div>
      </div>
      
      <div className="card text-center">
        <div className="text-2xl font-bold text-info">
          {stats.totalUnits || 0}
        </div>
        <div className="text-neutral-600">Total Units</div>
      </div>
      
      <div className="card text-center">
        <div className="text-2xl font-bold text-warning">
          {stats.maintenanceRequests || 0}
        </div>
        <div className="text-neutral-600">Open Requests</div>
      </div>
    </div>
  )
}

/**
 * Properties Overview - React 19 data fetching
 */
function PropertiesOverviewContent() {
  const { data: properties } = useProperties()
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Recent Properties</h3>
      <div className="stack">
        {properties.slice(0, 3).map((property) => (
          <div key={property.id} className="between p-3 bg-neutral-50 rounded-lg">
            <div>
              <div className="font-medium">{property.name}</div>
              <div className="text-sm text-neutral-600">{property.address}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-success">Active</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Loading Components - UnoCSS shortcuts
 */
function DashboardStatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 space-fluid-sm">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card">
          <div className="w-16 h-8 bg-neutral-200 rounded animate-pulse mb-2"></div>
          <div className="w-24 h-4 bg-neutral-100 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  )
}

function PropertiesLoading() {
  return (
    <div className="card">
      <div className="w-32 h-6 bg-neutral-200 rounded animate-pulse mb-4"></div>
      <div className="stack">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="between p-3 bg-neutral-50 rounded-lg">
            <div className="stack">
              <div className="w-32 h-4 bg-neutral-200 rounded animate-pulse"></div>
              <div className="w-48 h-3 bg-neutral-100 rounded animate-pulse"></div>
            </div>
            <div className="w-12 h-4 bg-neutral-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Modern Dashboard with React 19 Suspense
 * Each section loads independently for better UX
 */
export function ModernDashboard() {
  return (
    <div className="p-8 space-fluid-lg">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-600">Welcome back to TenantFlow</p>
      </div>
      
      {/* Stats Section with Independent Loading */}
      <Suspense fallback={<DashboardStatsLoading />}>
        <DashboardStatsContent />
      </Suspense>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 space-fluid-md mt-8">
        {/* Properties Section */}
        <Suspense fallback={<PropertiesLoading />}>
          <PropertiesOverviewContent />
        </Suspense>
        
        {/* Quick Actions - No loading needed */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="btn-primary">Add Property</button>
            <button className="btn-secondary">New Tenant</button>
            <button className="btn-secondary">Maintenance</button>
            <button className="btn-secondary">Reports</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Dashboard Route Component - Server Component by default
 * Only client components need 'use client'
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <ModernDashboard />
    </div>
  )
}