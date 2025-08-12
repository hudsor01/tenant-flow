'use client'

import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Wrench, 
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function MaintenanceStats() {
  const { data: maintenanceRequests, isLoading, error } = useMaintenanceRequests()
  
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
        <AlertTitle>Error loading maintenance requests</AlertTitle>
        <AlertDescription>
          There was a problem loading your maintenance data.
        </AlertDescription>
      </Alert>
    )
  }
  
  const totalRequests = maintenanceRequests?.length || 0
  const openRequests = maintenanceRequests?.filter(request => request.status === 'OPEN').length || 0
  const inProgressRequests = maintenanceRequests?.filter(request => request.status === 'IN_PROGRESS').length || 0
  const completedRequests = maintenanceRequests?.filter(request => request.status === 'COMPLETED').length || 0
  
  // Calculate urgent/high priority requests
  const urgentRequests = maintenanceRequests?.filter(request => 
    request.priority === 'EMERGENCY' && ['OPEN', 'IN_PROGRESS'].includes(request.status)
  ).length || 0
  
  const stats = [
    {
      title: 'Total Requests',
      value: totalRequests,
      description: `${openRequests + inProgressRequests} active`,
      icon: Wrench,
      color: 'text-blue-600'
    },
    {
      title: 'Open',
      value: openRequests,
      description: 'Awaiting assignment',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'In Progress',
      value: inProgressRequests,
      description: 'Being worked on',
      icon: AlertTriangle,
      color: 'text-yellow-600'
    },
    {
      title: 'Completed',
      value: completedRequests,
      description: 'Successfully resolved',
      icon: CheckCircle,
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
              {stat.title === 'Open' && urgentRequests > 0 && (
                <div className="mt-1">
                  <span className="text-xs text-red-600 font-medium">
                    {urgentRequests} urgent
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}