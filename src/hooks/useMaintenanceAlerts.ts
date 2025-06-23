import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface MaintenanceAlert {
  id: string
  type: 'emergency' | 'high_priority' | 'overdue' | 'new_request'
  severity: 'error' | 'warning' | 'info'
  title: string
  message: string
  createdAt: string
  updatedAt: string
  priority: 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  daysOld: number
  request: {
    id: string
    title: string
    description: string
    category: string
    priority: string
    status: string
    createdAt: string
    updatedAt: string
  }
  property: {
    id: string
    name: string
  }
  unit: {
    id: string
    unitNumber: string
  }
  tenant?: {
    id: string
    name: string
    email: string
  }
}

export function useMaintenanceAlerts() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['maintenanceAlerts', user?.id],
    queryFn: async (): Promise<MaintenanceAlert[]> => {
      if (!user?.id) return []

      try {
        // Get all maintenance requests for user's properties
        const { data: requests, error } = await supabase
          .from('MaintenanceRequest')
          .select(`
            id,
            title,
            description,
            category,
            priority,
            status,
            createdAt,
            updatedAt,
            unit:Unit(
              id,
              unitNumber,
              property:Property(
                id,
                name,
                ownerId
              )
            ),
            tenant:Tenant(
              id,
              name,
              email
            )
          `)
          .order('createdAt', { ascending: false })

        if (error) {
          console.error('Error fetching maintenance requests for alerts:', error)
          return []
        }

        // Filter requests for user's properties only
        const userRequests = requests?.filter(request => 
          request.unit?.property?.ownerId === user.id
        ) || []

        const alerts: MaintenanceAlert[] = []
        const now = new Date()

        userRequests.forEach((request: unknown) => {
          if (!request.unit?.property) return

          const createdAt = new Date(request.createdAt)
          const daysOld = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24))

          let alertType: 'emergency' | 'high_priority' | 'overdue' | 'new_request'
          let severity: 'error' | 'warning' | 'info'
          let title: string
          let message: string

          // Emergency maintenance - immediate attention required
          if (request.priority === 'EMERGENCY' && request.status !== 'COMPLETED') {
            alertType = 'emergency'
            severity = 'error'
            title = '🚨 Emergency Maintenance'
            message = `EMERGENCY: ${request.title} at ${request.unit.property.name} Unit ${request.unit.unitNumber} requires immediate attention.`
          }
          // High priority maintenance
          else if (request.priority === 'HIGH' && request.status !== 'COMPLETED') {
            alertType = 'high_priority'
            severity = 'warning'
            title = '⚠️ High Priority Maintenance'
            message = `High priority maintenance: ${request.title} at ${request.unit.property.name} Unit ${request.unit.unitNumber}.`
          }
          // Overdue maintenance (pending for more than 3 days, in-progress for more than 7 days)
          else if (
            (request.status === 'PENDING' && daysOld > 3) ||
            (request.status === 'IN_PROGRESS' && daysOld > 7)
          ) {
            alertType = 'overdue'
            severity = request.priority === 'HIGH' ? 'error' : 'warning'
            title = `⏰ Overdue Maintenance (${daysOld} days)`
            message = `Maintenance request "${request.title}" at ${request.unit.property.name} Unit ${request.unit.unitNumber} has been ${request.status.toLowerCase().replace('_', ' ')} for ${daysOld} days.`
          }
          // New requests (created in last 24 hours)
          else if (request.status === 'PENDING' && daysOld === 0) {
            alertType = 'new_request'
            severity = 'info'
            title = '📝 New Maintenance Request'
            message = `New maintenance request: ${request.title} at ${request.unit.property.name} Unit ${request.unit.unitNumber}.`
          }
          else {
            // Not urgent enough for alert
            return
          }

          alerts.push({
            id: `maintenance-alert-${request.id}`,
            type: alertType,
            severity,
            title,
            message,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt || request.createdAt,
            priority: request.priority,
            status: request.status,
            daysOld,
            request: {
              id: request.id,
              title: request.title,
              description: request.description,
              category: request.category,
              priority: request.priority,
              status: request.status,
              createdAt: request.createdAt,
              updatedAt: request.updatedAt || request.createdAt
            },
            property: {
              id: request.unit.property.id,
              name: request.unit.property.name
            },
            unit: {
              id: request.unit.id,
              unitNumber: request.unit.unitNumber
            },
            tenant: request.tenant ? {
              id: request.tenant.id,
              name: request.tenant.name,
              email: request.tenant.email
            } : undefined
          })
        })

        // Sort alerts by priority: Emergency > High Priority > Overdue > New
        alerts.sort((a, b) => {
          const priority = {
            'emergency': 0,
            'high_priority': 1,
            'overdue': 2,
            'new_request': 3
          }
          
          const aPriority = priority[a.type]
          const bPriority = priority[b.type]
          
          if (aPriority !== bPriority) return aPriority - bPriority
          
          // If same alert type, sort by days old (oldest first for overdue)
          if (a.type === 'overdue' && b.type === 'overdue') {
            return b.daysOld - a.daysOld
          }
          
          // Otherwise sort by creation date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        return alerts

      } catch (error) {
        console.error('Error generating maintenance alerts:', error)
        return []
      }
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes (more frequent for urgent maintenance)
    staleTime: 1000 * 60 * 2, // Consider stale after 2 minutes
  })
}

export function useMaintenanceAlertCounts() {
  const { data: alerts = [] } = useMaintenanceAlerts()

  return {
    total: alerts.length,
    emergency: alerts.filter(a => a.type === 'emergency').length,
    highPriority: alerts.filter(a => a.type === 'high_priority').length,
    overdue: alerts.filter(a => a.type === 'overdue').length,
    newRequests: alerts.filter(a => a.type === 'new_request').length,
    critical: alerts.filter(a => a.severity === 'error').length,
    warnings: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length
  }
}