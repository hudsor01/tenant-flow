'use client'

import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/api/use-notifications'
import { useAuth } from '@/hooks/use-auth'

/**
 * Test component to verify native Supabase notifications work
 * DELETE this component after testing - it's only for validation
 */
export function TestNotifications() {
  const { user } = useAuth()
  const { createNotification, createMaintenanceNotification, notifications, unreadNotifications } = useNotifications()

  const handleCreateTest = () => {
    if (!user) {
      alert('Please log in first')
      return
    }

    createNotification({
      recipient_id: user.id,
      title: 'Test Notification',
      message: 'This is a test notification created with native Supabase',
      type: 'test',
      priority: 'LOW'
    })
  }

  const handleCreateMaintenance = () => {
    if (!user) {
      alert('Please log in first')
      return
    }

    createMaintenanceNotification({
      ownerId: user.id,
      title: 'Maintenance Request Test',
      description: 'Test maintenance request notification',
      priority: 'MEDIUM',
      propertyName: 'Test Property',
      unitNumber: '101'
    })
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Test Notifications (Native Supabase)</h3>
      
      <div className="space-y-2 mb-4">
        <p>Total notifications: {notifications?.length || 0}</p>
        <p>Unread notifications: {unreadNotifications?.length || 0}</p>
      </div>

      <div className="space-x-2">
        <Button onClick={handleCreateTest}>
          Create Test Notification
        </Button>
        <Button onClick={handleCreateMaintenance}>
          Create Maintenance Notification
        </Button>
      </div>

      {notifications && notifications.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Recent Notifications:</h4>
          <div className="space-y-2">
            {notifications.slice(0, 3).map(notification => (
              <div key={notification.id} className="text-sm p-2 bg-gray-50 rounded">
                <div className="font-medium">{notification.title}</div>
                <div className="text-gray-600">{notification.message}</div>
                <div className="text-xs text-gray-400">
                  {notification.priority} • {notification.is_read ? 'Read' : 'Unread'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}