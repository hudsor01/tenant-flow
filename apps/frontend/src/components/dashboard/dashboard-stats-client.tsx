'use client'

import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Building2, Users, FileText, DollarSign } from 'lucide-react'

export function DashboardStats() {
  const { data: stats, error } = useDashboardStats({
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  })
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard statistics. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  // Data should already be loaded by Suspense boundary
  if (!stats) return null
  
  const statCards = [
    {
      title: 'Total Properties',
      value: stats.properties?.totalProperties || 0,
      description: `${stats.properties?.totalProperties || 0} total`,
      icon: Building2,
      color: 'text-blue-600'
    },
    {
      title: 'Total Tenants',
      value: stats.tenants?.totalTenants || 0,
      description: `${stats.tenants?.totalTenants || 0} total`,
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Active Leases',
      value: stats.leases?.activeLeases || 0,
      description: `${stats.leases?.expiredLeases || 0} expired`,
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      title: 'Monthly Revenue',
      value: `$${(stats.properties?.totalMonthlyRent || 0).toLocaleString()}`,
      description: `Average: $${(stats.properties?.potentialRent || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600'
    }
  ]
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <CardDescription className="text-xs">
                {stat.description}
              </CardDescription>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}