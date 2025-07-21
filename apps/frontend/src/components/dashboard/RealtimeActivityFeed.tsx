import {
  Clock,
  Home,
  Wrench,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useActivityFeed, type Activity } from '@/hooks/useActivityFeed'
import { cn } from '@/lib/utils/css.utils'
import type { Database } from '@/types/supabase-generated'

type NotificationType = Database['public']['Enums']['NotificationType']


interface RealtimeActivity extends Omit<Activity, 'entityName'> {
  isNew?: boolean
  timestamp?: string
  entityName: string
}

// Helper to convert Activity from hook to RealtimeActivity
function toRealtimeActivity(activity: Activity): RealtimeActivity {
  return {
    id: activity.id,
    timestamp: activity.createdAt,
    createdAt: activity.createdAt,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    entityName: activity.entityName || 'Unknown Entity',
    userId: activity.userId,
    priority: activity.priority,
    metadata: activity.metadata,
  }
}

const activityIcons: Record<NotificationType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  PROPERTY: Home,
  TENANT: Users,
  MAINTENANCE: Wrench,
  PAYMENT: DollarSign,
  LEASE: FileText,
  SYSTEM: Clock
}

const priorityColors: Record<'low' | 'medium' | 'high', string> = {
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
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString()
}

function ActivityItem({ activity }: { activity: RealtimeActivity }) {
  const Icon = activityIcons[activity.entityType as NotificationType] || Clock

  return (
    <div
      className={cn(
        'flex items-start space-x-3 rounded-lg p-3 transition-all duration-300',
        activity.isNew &&
        'animate-pulse border border-green-200 bg-green-50 shadow-sm'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          activity.priority === 'high'
            ? 'bg-red-100'
            : activity.priority === 'medium'
              ? 'bg-blue-100'
              : 'bg-gray-100'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            activity.priority === 'high'
              ? 'text-red-600'
              : activity.priority === 'medium'
                ? 'text-blue-600'
                : 'text-gray-600'
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-gray-900">
            {activity.action}
          </p>
          <div className="flex items-center space-x-2">
            {activity.isNew && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-xs text-green-700"
              >
                New
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                priorityColors[activity.priority || 'low']
              )}
            >
              {activity.priority || 'low'}
            </Badge>
          </div>
        </div>

        <p className="truncate text-sm text-gray-600">
          {activity.entityName}
        </p>

        {activity.metadata && (
          <div className="mt-1 flex flex-wrap gap-1">
            {typeof activity.metadata.propertyName !== 'undefined' && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                📍 {String(activity.metadata.propertyName)}
              </span>
            )}
            {typeof activity.metadata.unitNumber !== 'undefined' && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                🏠 Unit {String(activity.metadata.unitNumber)}
              </span>
            )}
            {typeof activity.metadata.amount !== 'undefined' && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                💰 ${String(activity.metadata.amount)}
              </span>
            )}
            {typeof activity.metadata.status !== 'undefined' && (
              <span
                className={cn(
                  'rounded px-2 py-1 text-xs',
                  activity.metadata.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : activity.metadata.status === 'FAILED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                )}
              >
                {activity.metadata.status === 'COMPLETED' && (
                  <CheckCircle className="mr-1 inline h-3 w-3" />
                )}
                {activity.metadata.status === 'FAILED' && (
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                )}
                {String(activity.metadata.status)}
              </span>
            )}
          </div>
        )}

        <p className="mt-1 text-xs text-gray-500">
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>
    </div>
  )
}

export function RealtimeActivityFeed() {
  const {
    data,
    isLoading,
    error,
  } = useActivityFeed(15)

  const activities = data?.data ?? []
  const isConnected = data?.isConnected ?? false
  const hasRealtimeUpdates = data?.hasNewActivities ?? false

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Live Activity Feed</span>
            <WifiOff className="h-4 w-4 text-red-500" />
          </CardTitle>
          <CardDescription>
            Error loading activity feed
          </CardDescription>
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
            <Clock className="h-5 w-5" />
            <span>Live Activity Feed</span>
            {isConnected ? (
              <Wifi
                className="h-4 w-4 text-green-500"
              />
            ) : (
              <WifiOff
                className="h-4 w-4 text-red-500"
              />
            )}
          </div>
          {hasRealtimeUpdates && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700"
            >
              Live Updates
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isConnected
            ? 'Real-time updates from your properties, tenants, and maintenance requests'
            : 'Recent activity (real-time connection unavailable)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="flex items-start space-x-3 p-3"
              >
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">No recent activity</p>
            <p className="mt-1 text-sm text-gray-400">
              Activity will appear here as you manage properties,
              tenants, and maintenance requests
            </p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {Array.isArray(activities) &&
                activities.map((activity) => {
                  const realtimeActivity = toRealtimeActivity(activity)
                  return (
                    <ActivityItem
                      key={`${activity.id}-${realtimeActivity.timestamp || activity.createdAt}`}
                      activity={realtimeActivity}
                    />
                  )
                })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
