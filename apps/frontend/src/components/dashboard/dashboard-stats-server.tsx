/**
 * Dashboard Stats Server Component - Next.js 15 Architecture
 * 
 * Server component wrapper for dashboard statistics with Suspense
 */

import { Suspense } from 'react'
import { DashboardStatsLoading } from './dashboard-stats-loading'

// Dynamic import for client component
async function DashboardStatsClient() {
  const { DashboardStats } = await import('./dashboard-stats-client')
  return <DashboardStats />
}

export function DashboardStatsServer() {
  return (
    <Suspense fallback={<DashboardStatsLoading />}>
      <DashboardStatsClient />
    </Suspense>
  )
}