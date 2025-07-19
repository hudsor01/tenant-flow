/**
 * Maintenance utilities
 * Helper functions for maintenance priority and status display
 */

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'ON_HOLD'

export const getPriorityLabel = (priority: Priority): string => {
  const labels: Record<Priority, string> = {
    LOW: 'Low Priority',
    MEDIUM: 'Medium Priority',
    HIGH: 'High Priority',
    EMERGENCY: 'Emergency'
  }
  return labels[priority] || priority
}

export const getPriorityColor = (priority: Priority): string => {
  const colors: Record<Priority, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    EMERGENCY: 'bg-red-100 text-red-800'
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}

export const getRequestStatusLabel = (status: RequestStatus): string => {
  const labels: Record<RequestStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELED: 'Canceled',
    ON_HOLD: 'On Hold'
  }
  return labels[status] || status
}

export const getRequestStatusColor = (status: RequestStatus): string => {
  const colors: Record<RequestStatus, string> = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELED: 'bg-gray-100 text-gray-800',
    ON_HOLD: 'bg-orange-100 text-orange-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}