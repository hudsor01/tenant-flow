'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationsCount
} from '#hooks/api/use-notifications'
import { CheckCircle2, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import type { Database } from '@repo/shared/types/supabase'

type NotificationItem = Database['public']['Tables']['notifications']['Row']

export default function TenantNotificationsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const {
    data,
    isLoading,
    isFetching
  } = useNotifications({ page, limit: 10, unreadOnly: filter === 'unread' })
  const { data: unreadData } = useUnreadNotificationsCount()
  const unreadCount = unreadData?.total ?? 0

  const markNotificationRead = useMarkNotificationRead()
  const deleteNotification = useDeleteNotification()
  const markAllNotificationsRead = useMarkAllNotificationsRead()

  const handleOpenNotification = (notification: NotificationItem) => {
    if (!notification.action_url) return

    router.push(notification.action_url)

    if (!notification.is_read) {
      markNotificationRead.mutate(notification.id)
    }
  }

  const totalPages =
    data && data.limit
      ? Math.max(1, Math.ceil(data.total / data.limit))
      : 1

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="typography-h2 tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Stay on top of maintenance updates, lease actions, and payment alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={unreadCount > 0 ? 'secondary' : 'outline'}>
            {unreadCount} unread
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={markAllNotificationsRead.isPending || unreadCount === 0}
            onClick={() => markAllNotificationsRead.mutate()}
            className="gap-1"
          >
            {markAllNotificationsRead.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Mark all read
          </Button>
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={value => {
          setFilter(value as 'all' | 'unread')
          setPage(1)
        }}
      >
        <TabsList className="w-fit">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4 pt-4">
          <NotificationList
            variant="all"
            loading={isLoading}
            data={data?.data ?? []}
            totalPages={totalPages}
            page={page}
            isFetching={isFetching}
            onPrev={() => setPage(prev => Math.max(1, prev - 1))}
            onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
            onOpen={handleOpenNotification}
            onMarkRead={id => markNotificationRead.mutate(id)}
            onDelete={id => deleteNotification.mutate(id)}
            mutating={
              markNotificationRead.isPending || deleteNotification.isPending
            }
          />
        </TabsContent>
        <TabsContent value="unread" className="space-y-4 pt-4">
          <NotificationList
            variant="unread"
            loading={isLoading}
            data={data?.data ?? []}
            totalPages={totalPages}
            page={page}
            isFetching={isFetching}
            onPrev={() => setPage(prev => Math.max(1, prev - 1))}
            onNext={() => setPage(prev => Math.min(totalPages, prev + 1))}
            onOpen={handleOpenNotification}
            onMarkRead={id => markNotificationRead.mutate(id)}
            onDelete={id => deleteNotification.mutate(id)}
            mutating={
              markNotificationRead.isPending || deleteNotification.isPending
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface NotificationListProps {
  variant: 'all' | 'unread'
  loading: boolean
  data: NotificationItem[]
  page: number
  totalPages: number
  isFetching: boolean
  onPrev: () => void
  onNext: () => void
  onOpen: (notification: NotificationItem) => void
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  mutating: boolean
}

function NotificationList({
  variant,
  loading,
  data,
  page,
  totalPages,
  isFetching,
  onPrev,
  onNext,
  onOpen,
  onMarkRead,
  onDelete,
  mutating
}: NotificationListProps) {
  const isEmpty = !loading && data.length === 0

  return (
    <CardLayout
      title={variant === 'unread' ? 'Unread Notifications' : 'All Notifications'}
      className="p-4 border shadow-sm"
    >
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="rounded-lg border p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3 mt-2" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No {variant} notifications.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {data.map(notification => {
            const createdAt = notification.created_at
              ? new Date(notification.created_at).toLocaleString()
              : ''
            return (
              <div
                key={notification.id}
                className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={notification.is_read ? 'outline' : 'default'}
                    >
                      {notification.notification_type}
                    </Badge>
                    <span className="font-medium text-foreground">
                      {notification.title}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message ?? 'No message provided'}
                  </p>
                  <p className="text-xs text-muted-foreground">{createdAt}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                  {notification.action_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => onOpen(notification)}
                    >
                      <ExternalLink className="size-4" />
                      Open
                    </Button>
                  ) : null}
                  {!notification.is_read && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => onMarkRead(notification.id)}
                      disabled={mutating}
                    >
                      {mutating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive"
                    onClick={() => onDelete(notification.id)}
                    disabled={mutating}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading || isFetching}
            onClick={onPrev}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading || isFetching}
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </div>
    </CardLayout>
  )
}
