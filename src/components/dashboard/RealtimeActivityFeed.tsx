import React from 'react'
import { Clock, Home, Wrench, DollarSign, Users, FileText, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useRealtimeActivityFeed } from '../../hooks/useRealtimeActivityFeed'
import { cn } from '../../lib/utils'

const activityIcons = {
  property: Home,
  tenant: Users,
  maintenance: Wrench,
  payment: DollarSign,
  lease: FileText,
  unit: Home
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700'
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}

function ActivityItem({ activity }: { activity: unknown }) {
  const Icon = activityIcons[activity.entityType] || Clock
  
  return (
    <div className={cn(
      "flex items-start space-x-3 p-3 rounded-lg transition-all duration-300",
      activity.isNew && "bg-green-50 border border-green-200 shadow-sm animate-pulse"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        activity.priority === 'high' ? 'bg-red-100' : 
        activity.priority === 'medium' ? 'bg-blue-100' : 'bg-gray-100'
      )}>
        <Icon className={cn(
          "w-4 h-4",
          activity.priority === 'high' ? 'text-red-600' : 
          activity.priority === 'medium' ? 'text-blue-600' : 'text-gray-600'
        )} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.action}
          </p>
          <div className="flex items-center space-x-2">
            {activity.isNew && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                New
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-xs", priorityColors[activity.priority])}>
              {activity.priority}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 truncate">
          {activity.entityName}
        </p>
        
        {activity.metadata && (
          <div className="mt-1 flex flex-wrap gap-1">
            {activity.metadata.propertyName && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                📍 {activity.metadata.propertyName}
              </span>
            )}
            {activity.metadata.unitNumber && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                🏠 Unit {activity.metadata.unitNumber}
              </span>
            )}
            {activity.metadata.amount && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                💰 ${activity.metadata.amount}
              </span>
            )}
            {activity.metadata.status && (
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                activity.metadata.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                activity.metadata.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {activity.metadata.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {activity.metadata.status === 'FAILED' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                {activity.metadata.status}
              </span>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-1">
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>
    </div>
  )
}

export function RealtimeActivityFeed() {
  const { data: activities = [], isLoading, error, isConnected, hasRealtimeUpdates } = useRealtimeActivityFeed(15)

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Live Activity Feed</span>
            <WifiOff className="w-4 h-4 text-red-500" />
          </CardTitle>
          <CardDescription>Error loading activity feed</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            Failed to load recent activities. Please refresh the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Live Activity Feed</span>
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" title="Real-time connected" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" title="Real-time disconnected" />
            )}
          </div>
          {hasRealtimeUpdates && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Live Updates
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isConnected 
            ? "Real-time updates from your properties, tenants, and maintenance requests" 
            : "Recent activity (real-time connection unavailable)"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 p-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400 mt-1">
              Activity will appear here as you manage properties, tenants, and maintenance requests
            </p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {activities.map((activity) => (
                <ActivityItem 
                  key={`${activity.id}-${activity.timestamp || activity.createdAt}`} 
                  activity={activity} 
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}