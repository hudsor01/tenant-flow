'use client'

import { useLeases } from '@/hooks/api/use-leases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function LeasesStats() {
  const { data: leases, isLoading, error } = useLeases()
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading leases</AlertTitle>
        <AlertDescription>
          There was a problem loading your leases data.
        </AlertDescription>
      </Alert>
    )
  }
  
  const totalLeases = leases?.length || 0
  const activeLeases = leases?.filter(lease => lease.status === 'ACTIVE').length || 0
  // const expiredLeases = leases?.filter(lease => lease.status === 'EXPIRED').length || 0
  
  // Calculate leases expiring within 30 days
  const expiringSoon = leases?.filter(lease => {
    if (lease.status !== 'ACTIVE') return false
    const endDate = new Date(lease.endDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return endDate <= thirtyDaysFromNow && endDate > new Date()
  }).length || 0
  
  // Calculate total monthly rent from active leases
  const totalMonthlyRent = leases?.reduce((total, lease) => {
    if (lease.status === 'ACTIVE') {
      return total + (lease.rentAmount || 0)
    }
    return total
  }, 0) || 0
  
  const stats = [
    {
      title: 'Total Leases',
      value: totalLeases,
      description: `${activeLeases} currently active`,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Active Leases',
      value: activeLeases,
      description: 'Currently in effect',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Expiring Soon',
      value: expiringSoon,
      description: 'Within 30 days',
      icon: Calendar,
      color: expiringSoon > 0 ? 'text-orange-600' : 'text-gray-600'
    },
    {
      title: 'Monthly Revenue',
      value: `$${totalMonthlyRent.toLocaleString()}`,
      description: 'From active leases',
      icon: DollarSign,
      color: 'text-green-600'
    }
  ]
  
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}