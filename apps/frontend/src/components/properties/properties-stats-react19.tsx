/**
 * Properties Stats - React 19 Optimized Version
 * 
 * Demonstrates conversion from Client Component to Server Component with:
 * - Server-side data fetching
 * - Suspense boundaries for loading states
 * - Error boundaries for error handling
 * - Minimal client-side JavaScript
 * - Better performance and SEO
 */

import React, { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Building2, Users, Home, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'

// ============================================================================
// TYPES
// ============================================================================

interface PropertyStatsData {
  total: number
  occupied: number
  vacant: number
  occupancyRate: number
  monthlyChange?: number
  revenue?: number
}

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
}

// ============================================================================
// SERVER DATA FETCHING
// ============================================================================

/**
 * Server-side data fetching function
 * Replaces client-side usePropertyStats hook
 */
async function getPropertyStats(): Promise<PropertyStatsData> {
  try {
    // Server-side API call with caching
    const response = await apiClient.get('/properties/stats', {
      next: { 
        revalidate: 300, // Cache for 5 minutes
        tags: ['properties', 'stats'] 
      }
    })
    
    return response.data
  } catch (error) {
    console.error('Failed to fetch property stats:', error)
    throw error
  }
}

// ============================================================================
// LOADING COMPONENTS (Server Components)
// ============================================================================

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsError({ error: _error }: { error: Error }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error loading properties</AlertTitle>
      <AlertDescription>
        There was a problem loading your properties data. Please try again later.
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// STAT CARD COMPONENTS (Server Components)
// ============================================================================

function StatCard({ title, value, description, icon, color, trend }: StatCardProps) {
  const Icon = icon
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {trend && (
            <div className={cn(
              "flex items-center text-xs font-medium",
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
          <Icon className={cn('h-4 w-4', color)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
        </div>
        <p className="text-muted-foreground text-xs">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STATS DISPLAY COMPONENT (Server Component)
// ============================================================================

async function StatsDisplay() {
  // Server-side data fetching
  const statsData = await getPropertyStats()
  
  const totalProperties = statsData.total || 0
  const totalUnits = (statsData.occupied || 0) + (statsData.vacant || 0)
  const occupiedUnits = statsData.occupied || 0
  const occupancyRate = statsData.occupancyRate || 0
  
  // Calculate stat configurations
  const statConfigs = [
    {
      title: 'Total Properties',
      value: totalProperties,
      description: `${totalUnits} total units`,
      icon: Building2,
      color: 'text-primary',
      trend: statsData.monthlyChange ? {
        value: statsData.monthlyChange,
        direction: statsData.monthlyChange > 0 ? 'up' as const : 'down' as const
      } : undefined
    },
    {
      title: 'Occupancy Rate',
      value: `${occupancyRate}%`,
      description: `${occupiedUnits}/${totalUnits} occupied`,
      icon: Home,
      color:
        occupancyRate >= 90
          ? 'text-green-600'
          : occupancyRate >= 70
            ? 'text-yellow-600'
            : 'text-red-600'
    },
    {
      title: 'Active Tenants',
      value: occupiedUnits,
      description: 'Current tenants',
      icon: Users,
      color: 'text-purple-600'
    }
  ]
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statConfigs.map(stat => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          description={stat.description}
          icon={stat.icon}
          color={stat.color}
          trend={stat.trend}
        />
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT (Server Component with Error Boundary)
// ============================================================================

/**
 * React 19 Optimized Properties Stats Component
 * 
 * Server Component that:
 * - Fetches data on the server
 * - Uses Suspense for loading states
 * - Has built-in error handling
 * - Renders faster with no client-side JavaScript
 * - Better SEO and performance
 */
export function PropertiesStatsReact19() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <React.ErrorBoundary fallback={<StatsError error={new Error('Stats failed to load')} />}>
        <StatsDisplay />
      </React.ErrorBoundary>
    </Suspense>
  )
}

// ============================================================================
// ALTERNATIVE: HYBRID APPROACH WITH CLIENT REFRESH
// ============================================================================

/**
 * Hybrid version with client-side refresh capability
 * Shows how to add minimal interactivity while keeping most content server-rendered
 */
function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }
  
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  )
}

export function PropertiesStatsWithRefresh() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Property Statistics</h2>
        <RefreshButton onRefresh={() => {
          // Trigger revalidation
          window.location.reload()
        }} />
      </div>
      
      <Suspense fallback={<StatsLoading />}>
        <React.ErrorBoundary fallback={<StatsError error={new Error('Stats failed to load')} />}>
          <StatsDisplay />
        </React.ErrorBoundary>
      </Suspense>
    </div>
  )
}

export default PropertiesStatsReact19

// ============================================================================
// MIGRATION NOTES
// ============================================================================

/*
BEFORE (Client Component):
- ❌ 'use client' directive required
- ❌ Client-side data fetching with usePropertyStats
- ❌ Manual loading and error state management
- ❌ Additional JavaScript bundle size
- ❌ Slower initial render (requires hydration)
- ❌ Poor SEO (content not available during SSR)

AFTER (Server Component):
- ✅ No 'use client' directive needed
- ✅ Server-side data fetching with caching
- ✅ Suspense boundaries for loading states
- ✅ Error boundaries for error handling
- ✅ Zero client-side JavaScript for static content
- ✅ Faster initial render (pre-rendered on server)
- ✅ Better SEO (fully rendered HTML)
- ✅ Automatic caching and revalidation

PERFORMANCE IMPROVEMENTS:
- Reduced JavaScript bundle size
- Faster Time to First Byte (TTFB)
- Better Core Web Vitals scores
- Improved accessibility and SEO

MIGRATION STEPS:
1. Remove 'use client' directive
2. Replace usePropertyStats hook with server-side data fetching
3. Wrap with Suspense for loading states
4. Add Error Boundary for error handling
5. Test server-side rendering
6. Add client islands only where needed (e.g., refresh button)
*/