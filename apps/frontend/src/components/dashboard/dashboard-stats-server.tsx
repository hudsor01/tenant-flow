/**
 * Dashboard Stats Server Component - Next.js 15 Architecture
 * 
 * Server component wrapper for dashboard statistics with Suspense
 */

import { Suspense } from 'react'
import { DashboardStatsLoading } from './dashboard-stats-loading'

// Dynamic import for client component
async function DashboardStatsClient() {
  const { DashboardStatsCards } = await import('./dashboard-stats-cards')
  return <DashboardStatsCards />
}

export function DashboardStatsServer() {
  return (
    <Suspense fallback={<DashboardStatsLoading />}>
      <DashboardStatsClient />
    </Suspense>
  )
}