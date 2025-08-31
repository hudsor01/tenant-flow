'use client'

import { Suspense } from 'react'
import { DashboardStatsCards } from '@/components/dashboard/dashboard-stats-cards'
import { RevenueChart, PropertyRevenueChart } from '@/components/tailadmin'
import { ErrorBoundary } from 'react-error-boundary'
import { TestNotifications } from '@/components/test-notifications'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

// Error fallback component
function DashboardError({ error, resetErrorBoundary }: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
          Dashboard Error
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {error.message || 'Something went wrong loading your dashboard'}
        </p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

// Loading component for entire page
function DashboardPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="w-48 h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-4"></div>
          <div className="w-64 h-4 bg-gray-20 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl mb-4 animate-pulse"></div>
              <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded mb-2 animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 dark:bg-slate-700 rounded mb-2 animate-pulse"></div>
              <div className="w-20 h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Simplified Dashboard Page
 * Focus on performance and clarity over complex animations
 */
export default function DashboardPage() {
  return (
    <ErrorBoundary FallbackComponent={DashboardError}>
      <Suspense fallback={<DashboardPageLoading />}>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Simple Header */}
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/50">
                <TrendingUp className="mr-2 h-4 w-4" />
                Live Dashboard
              </Badge>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-90 dark:text-white mb-4">
                Property Management Central
              </h1>
              
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
                Real-time insights and intelligent automation for your property portfolio
              </p>
            </div>

            {/* Test Notifications */}
            <div className="mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
                <TestNotifications />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-12">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm">
                <DashboardStatsCards />
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <PropertyRevenueChart className="border-0 bg-transparent p-8" />
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <RevenueChart 
                  className="border-0 bg-transparent p-8"
                  title="Portfolio Performance"
                  data={[
                    {
                      name: "Net Revenue",
                      data: [12500, 13200, 12800, 14100, 15500, 16200, 17800, 18200, 17900, 19400, 21100, 22800],
                    },
                    {
                      name: "Occupancy Rate",
                      data: [85, 87, 84, 89, 91, 93, 95, 96, 94, 97, 98, 99],
                    },
                  ]}
                  height={350}
                />
              </div>
            </div>
          </div>
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}
