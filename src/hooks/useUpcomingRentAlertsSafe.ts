// Safe version of rent alerts that handles missing foreign keys
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface RentAlert {
  id: string
  type: 'overdue' | 'due_soon' | 'missed_payment' | 'upcoming'
  severity: 'error' | 'warning' | 'info'
  title: string
  message: string
  dueDate: string
  amount: number
  daysOverdue?: number
  daysUntilDue?: number
  lease: {
    id: string
    rentAmount: number
    dueDay: number
    status: string
  }
  tenant: {
    id: string
    name: string
    email: string
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

// Safe rent alerts that won't crash on missing foreign keys
export function useUpcomingRentAlerts() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['rent-alerts', user?.id],
    queryFn: async (): Promise<RentAlert[]> => {
      if (!user?.id) return []

      try {
        // Use simple query without complex joins that might fail
        const { data: leases, error } = await supabase
          .from('Lease')
          .select(`
            id,
            rentAmount,
            dueDay,
            status,
            tenantId,
            propertyId,
            unitId
          `)
          .eq('ownerId', user.id)
          .eq('status', 'ACTIVE')

        if (error) {
          console.error('Error fetching lease data for rent alerts:', error)
          return []
        }

        if (!leases) return []

        // Calculate alerts based on current date and due dates
        const today = new Date()
        const currentDay = today.getDate()
        const alerts: RentAlert[] = []

        leases.forEach(lease => {
          const dueDay = lease.dueDay || 1
          let daysUntilDue = dueDay - currentDay
          
          // Adjust for next month if due day has passed
          if (daysUntilDue < 0) {
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
            daysUntilDue = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          }

          let type: RentAlert['type']
          let severity: RentAlert['severity']
          let title: string
          let message: string

          if (daysUntilDue < 0) {
            type = 'overdue'
            severity = 'error'
            title = `Rent Overdue`
            message = `Payment is ${Math.abs(daysUntilDue)} days overdue`
          } else if (daysUntilDue <= 3) {
            type = 'due_soon'
            severity = 'warning'
            title = `Rent Due Soon`
            message = `Payment due in ${daysUntilDue} days`
          } else if (daysUntilDue <= 7) {
            type = 'upcoming'
            severity = 'info'
            title = `Upcoming Rent Payment`
            message = `Payment due in ${daysUntilDue} days`
          } else {
            return // Skip if more than 7 days away
          }

          const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay).toISOString()

          alerts.push({
            id: lease.id,
            type,
            severity,
            title,
            message,
            dueDate,
            amount: lease.rentAmount || 0,
            daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined,
            daysUntilDue: daysUntilDue >= 0 ? daysUntilDue : undefined,
            lease: {
              id: lease.id,
              rentAmount: lease.rentAmount || 0,
              dueDay: lease.dueDay || 1,
              status: lease.status
            },
            tenant: {
              id: lease.tenantId || '',
              name: 'Tenant',
              email: ''
            },
            property: {
              id: lease.propertyId || '',
              name: 'Property'
            },
            unit: {
              id: lease.unitId || '',
              name: 'Unit'
            }
          })
        })

        return alerts.sort((a, b) => {
          // Sort by severity, then by days until due
          const severityOrder = { error: 0, warning: 1, info: 2 }
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity]
          }
          return (a.daysUntilDue || 0) - (b.daysUntilDue || 0)
        })
      } catch (error) {
        console.error('Error in useUpcomingRentAlerts:', error)
        return []
      }
    },
    enabled: !!user?.id,
    retry: false,
  })
}

export function useRentAlertCounts() {
  const { data: alerts = [] } = useUpcomingRentAlerts()

  const counts = {
    total: alerts.length,
    overdue: alerts.filter(a => a.type === 'overdue').length,
    due_soon: alerts.filter(a => a.type === 'due_soon').length,
    missed_payment: alerts.filter(a => a.type === 'missed_payment').length,
    upcoming: alerts.filter(a => a.type === 'upcoming').length,
  }

  return counts
}