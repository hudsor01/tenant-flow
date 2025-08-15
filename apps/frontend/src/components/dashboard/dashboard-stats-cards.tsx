'use client'

import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Users, FileText, Wrench, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Dashboard Stats Cards Component
 * Focused component for displaying key metrics
 * Extracted from massive dashboard client component
 */
export function DashboardStatsCards() {
  const { data: stats, isLoading, error } = useDashboardStats()

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard statistics. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Properties",
      value: stats?.properties?.totalProperties || 0,
      description: `${stats?.properties?.occupancyRate || 0}% occupancy`,
      icon: Building2,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-primary",
      borderColor: "border-blue-200"
    },
    {
      title: "Active Tenants",
      value: stats?.tenants?.totalTenants || 0,
      description: "Active tenants",
      icon: Users,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-200"
    },
    {
      title: "Active Leases",
      value: stats?.leases?.totalLeases || 0,
      description: "Active leases",
      icon: FileText,
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      borderColor: "border-purple-200"
    },
    {
      title: "Maintenance",
      value: 0,
      description: "Maintenance requests",
      icon: Wrench,
      color: "orange",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        
        return (
          <Card 
            key={stat.title} 
            className={cn(
              "group relative overflow-hidden transition-all duration-300",
              "hover:shadow-lg hover:-translate-y-0.5",
              stat.borderColor
            )}
          >            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
              <CardTitle className="text-sm font-semibold text-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300 group-hover:scale-110",
                stat.bgColor,
                stat.borderColor,
                "border"
              )}>
                <Icon className={cn("h-4 w-4", stat.iconColor)} />
              </div>
            </CardHeader>
            
            <CardContent className="relative">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground transition-colors duration-300">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}