// Safe version of maintenance alerts that handles missing foreign keys
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
    name: string
  }
}

// Safe maintenance alerts that won't crash on missing foreign keys
export function useMaintenanceAlerts() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['maintenance-alerts', user?.id],
    queryFn: async (): Promise<MaintenanceAlert[]> => {
      if (!user?.id) return []

      try {
        // Use simple query without complex joins that might fail
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
            propertyId,
            unitId
          `)
          .eq('ownerId', user.id)
          .neq('status', 'COMPLETED')
          .order('createdAt', { ascending: false })

        if (error) {
          console.error('Error fetching maintenance requests for alerts:', error)
          return []
        }

        if (!requests) return []

        return requests.map(request => {
          const daysOld = Math.floor((Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          
          let type: MaintenanceAlert['type']
          let severity: MaintenanceAlert['severity']
          
          if (request.priority === 'EMERGENCY') {
            type = 'emergency'
            severity = 'error'
          } else if (request.priority === 'HIGH') {
            type = 'high_priority'
            severity = 'warning'
          } else if (daysOld > 7) {
            type = 'overdue'
            severity = 'warning'
          } else {
            type = 'new_request'
            severity = 'info'
          }

          return {
            id: request.id,
            type,
            severity,
            title: `${request.priority} Priority: ${request.title}`,
            message: request.description || 'No description provided',
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            priority: request.priority as MaintenanceAlert['priority'],
            status: request.status as MaintenanceAlert['status'],
            daysOld,
            request: {
              id: request.id,
              title: request.title,
              description: request.description || '',
              category: request.category || 'General',
              priority: request.priority,
              status: request.status,
              createdAt: request.createdAt,
              updatedAt: request.updatedAt
            },
            property: {
              id: request.propertyId || '',
              name: 'Property'
            },
            unit: {
              id: request.unitId || '',
              name: 'Unit'
            }
          }
        })
      } catch (error) {
        console.error('Error in useMaintenanceAlerts:', error)
        return []
      }
    },
    enabled: !!user?.id,
    retry: false,
  })
}

export function useMaintenanceAlertCounts() {
  const { data: alerts = [] } = useMaintenanceAlerts()

  const counts = {
    total: alerts.length,
    emergency: alerts.filter(a => a.type === 'emergency').length,
    high_priority: alerts.filter(a => a.type === 'high_priority').length,
    overdue: alerts.filter(a => a.type === 'overdue').length,
    new_request: alerts.filter(a => a.type === 'new_request').length,
  }

  return counts
}