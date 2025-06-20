import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Bell, CheckCheck, Search, Filter, Home, Users, Wrench, DollarSign, FileText, Clock, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteAllReadNotifications
} from '../hooks/useNotifications'
import type { NotificationWithRelations } from '@/types/relationships'

type NotificationType = 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const NotificationsPage: React.FC = () => {
  // Real data from database
  const { data: allNotifications = [], isLoading, error } = useNotifications()
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()
  const deleteNotificationMutation = useDeleteNotification()
  const deleteAllReadMutation = useDeleteAllReadNotifications()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'PROPERTY':
        return Home
      case 'TENANT':
        return Users
      case 'MAINTENANCE':
        return Wrench
      case 'PAYMENT':
        return DollarSign
      case 'LEASE':
        return FileText
      case 'SYSTEM':
        return Bell
      default:
        return Bell
    }
  }

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case 'PROPERTY':
        return 'text-blue-500 bg-blue-50'
      case 'TENANT':
        return 'text-green-500 bg-green-50'
      case 'MAINTENANCE':
        return 'text-orange-500 bg-orange-50'
      case 'PAYMENT':
        return 'text-emerald-500 bg-emerald-50'
      case 'LEASE':
        return 'text-purple-500 bg-purple-50'
      case 'SYSTEM':
        return 'text-gray-500 bg-gray-50'
      default:
        return 'text-gray-500 bg-gray-50'
    }
  }

  const getPriorityColor = (priority?: NotificationPriority) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'destructive'
      case 'MEDIUM':
        return 'secondary'
      case 'LOW':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const deleteAllRead = async () => {
    try {
      await deleteAllReadMutation.mutateAsync()
    } catch (error) {
      console.error('Failed to delete read notifications:', error)
    }
  }

  // Filter notifications
  const filteredNotifications = allNotifications.filter(notification => {
    // Extract property name from available fields
    const propertyName = 'Unknown Property' // Fallback for now

    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         propertyName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || notification.type === filterType.toUpperCase()
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'unread' && !notification.read) ||
                         (filterStatus === 'read' && notification.read)

    return matchesSearch && matchesType && matchesStatus
  })

  const filteredAllNotifications = filteredNotifications
  const filteredUnreadNotifications = filteredNotifications.filter(n => !n.read)

  const NotificationItem = ({ notification }: { notification: NotificationWithRelations }) => {
    const Icon = getIcon(notification.type)
    const iconColorClass = getIconColor(notification.type)

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className={`p-4 rounded-lg border ${
          !notification.read ? 'bg-accent/50 border-primary/20' : 'bg-card border-border'
        } hover:shadow-md transition-all cursor-pointer`}
        onClick={() => markAsRead(notification.id)}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-2 rounded-lg ${iconColorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-semibold">{notification.title}</h4>
                  {notification.priority && (
                    <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                      {notification.priority}
                    </Badge>
                  )}
                  {!notification.read && (
                    <Badge variant="default" className="text-xs">New</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                {(notification.propertyId || notification.tenantId || notification.maintenanceId) && (
                  <p className="text-xs text-muted-foreground">
                    <Home className="inline h-3 w-3 mr-1" />
                    Property related notification
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                  <span className="mx-2">•</span>
                  {format(notification.createdAt, 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                    disabled={deleteNotificationMutation.isPending}
                  >
                    Delete notification
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6 p-1">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 text-muted-foreground">Loading notifications...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Failed to load notifications</p>
            <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your property management activities
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-2"
        >
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="flex items-center"
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={deleteAllRead}
            className="flex items-center"
            disabled={allNotifications.filter(n => n.read).length === 0 || deleteAllReadMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear read
          </Button>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

          {/* Notifications Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
              <TabsTrigger value="all" className="flex items-center">
                All
                {filteredAllNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredAllNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center">
                Unread
                {filteredUnreadNotifications.length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {filteredUnreadNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredAllNotifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No notifications found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                        ? 'Try adjusting your filters'
                        : 'You\'re all caught up!'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredAllNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              {filteredUnreadNotifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No unread notifications</p>
                    <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredUnreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

export default NotificationsPage
