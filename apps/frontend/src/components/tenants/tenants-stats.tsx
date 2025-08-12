'use client'

import { useTenants } from '@/hooks/api/use-tenants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Users, 
  UserCheck,
  UserX,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function TenantsStats() {
  const { data: tenants, isLoading, error } = useTenants()
  
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
        <AlertTitle>Error loading tenants</AlertTitle>
        <AlertDescription>
          There was a problem loading your tenants data.
        </AlertDescription>
      </Alert>
    )
  }
  
  const totalTenants = tenants?.length || 0
  // Note: Basic Tenant interface doesn't include status or leases
  // These would need to come from a different endpoint with relations
  const acceptedInvitations = tenants?.filter(tenant => tenant.invitationStatus === 'ACCEPTED').length || 0
  const pendingInvitations = tenants?.filter(tenant => tenant.invitationStatus === 'PENDING' || tenant.invitationStatus === 'SENT').length || 0
  
  // Without access to lease data, we cannot calculate expiring leases
  // This would require using TenantWithLeases type from a different endpoint
  const expiringLeases = 0
  
  const stats = [
    {
      title: 'Total Tenants',
      value: totalTenants,
      description: 'All registered tenants',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Accepted Invites',
      value: acceptedInvitations,
      description: 'Active tenant accounts',
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      title: 'Pending Invites',
      value: pendingInvitations,
      description: 'Awaiting acceptance',
      icon: UserX,
      color: 'text-yellow-600'
    },
    {
      title: 'Expiring Soon',
      value: expiringLeases,
      description: 'Requires enhanced data',
      icon: Calendar,
      color: 'text-gray-400'
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