"use client"

import * as React from "react"
import {
  DollarSign,
  Users,
  Wrench,
  Calendar,
  FileText,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Recent Activity Card
interface RecentActivityCardProps {
  className?: string
  loading?: boolean
}

interface ActivityItem {
  id: string
  type: "payment" | "maintenance" | "lease" | "tenant"
  title: string
  subtitle: string
  timestamp: string
  status: "success" | "pending" | "alert"
}

export function RecentActivityCard({ className, loading = false }: RecentActivityCardProps) {
  const activities: ActivityItem[] = [
    {
      id: "1",
      type: "payment",
      title: "Rent Payment Received",
      subtitle: "Unit 4B - $2,850",
      timestamp: "2 minutes ago",
      status: "success"
    },
    {
      id: "2", 
      type: "maintenance",
      title: "Maintenance Request",
      subtitle: "Leaky faucet in Unit 2A",
      timestamp: "15 minutes ago",
      status: "pending"
    },
    {
      id: "3",
      type: "lease",
      title: "Lease Renewal Signed",
      subtitle: "Unit 1C - Sarah Johnson",
      timestamp: "1 hour ago", 
      status: "success"
    },
    {
      id: "4",
      type: "tenant",
      title: "New Tenant Application",
      subtitle: "3-bedroom unit inquiry",
      timestamp: "2 hours ago",
      status: "pending"
    }
  ]

  const getActivityIcon = (type: string, _status: string) => {
    const iconClasses = "h-4 w-4"
    
    switch (type) {
      case "payment":
        return <DollarSign className={iconClasses} />
      case "maintenance":
        return <Wrench className={iconClasses} />
      case "lease":
        return <FileText className={iconClasses} />
      case "tenant":
        return <Users className={iconClasses} />
      default:
        return <Calendar className={iconClasses} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
      case "pending":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
      case "alert":
        return "text-red-600 bg-red-50 dark:bg-red-950/30"
      default:
        return "text-muted-foreground bg-muted"
    }
  }

  if (loading) {
    return (
      <Card className={cn("@container/card card-modern", className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("@container/card card-modern", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-heading">Recent Activity</CardTitle>
        <CardDescription>
          Latest updates across your properties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div 
            key={activity.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              getStatusColor(activity.status)
            )}>
              {getActivityIcon(activity.type, activity.status)}
            </div>
            
            <div className="flex-1 space-y-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {activity.subtitle}
              </p>
            </div>
            
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.timestamp}
            </div>
          </div>
        ))}
      </CardContent>
      
      <CardFooter className="pt-0">
        <button className="w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          View all activity →
        </button>
      </CardFooter>
    </Card>
  )
}