import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface RentAlert {
  id: string
  type: 'upcoming' | 'overdue' | 'due_today'
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  dueDate: string
  daysFromDue: number
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
    unitNumber: string
  }
  lease: {
    id: string
    rentAmount: number
    dueDay: number
  }
  lastPayment?: {
    id: string
    amount: number
    paidDate: string
    status: string
  }
}

export function useUpcomingRentAlerts() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['rentAlerts', user?.id],
    queryFn: async (): Promise<RentAlert[]> => {
      if (!user?.id) return []

      try {
        // Get all active leases with tenant and property information
        const { data: leases, error } = await supabase
          .from('Lease')
          .select(`
            id,
            rentAmount,
            dueDay,
            startDate,
            endDate,
            status,
            tenant:Tenant(
              id,
              name,
              email
            ),
            unit:Unit(
              id,
              unitNumber,
              property:Property(
                id,
                name,
                ownerId
              )
            ),
            payments:Payment(
              id,
              amount,
              paidDate,
              status,
              createdAt
            )
          `)
          .eq('status', 'ACTIVE')
          .order('dueDay', { ascending: true })

        if (error) {
          console.error('Error fetching lease data for rent alerts:', error)
          return []
        }

        // Filter leases owned by current user
        const userLeases = leases?.filter(lease => 
          lease.unit?.property?.ownerId === user.id
        ) || []

        const alerts: RentAlert[] = []
        const today = new Date()
        const currentMonth = today.getMonth()
        const currentYear = today.getFullYear()

        userLeases.forEach((lease: unknown) => {
          if (!lease.tenant || !lease.unit?.property) return

          const dueDay = lease.dueDay || 1
          
          // Calculate current month's due date
          let currentDueDate = new Date(currentYear, currentMonth, dueDay)
          
          // If due date has passed this month, check next month
          if (currentDueDate < today) {
            currentDueDate = new Date(currentYear, currentMonth + 1, dueDay)
          }

          // Calculate days difference
          const timeDiff = currentDueDate.getTime() - today.getTime()
          const daysFromDue = Math.ceil(timeDiff / (1000 * 3600 * 24))

          // Get most recent payment for this lease
          const recentPayments = lease.payments
            ?.filter((p: unknown) => p.status === 'COMPLETED')
            ?.sort((a: unknown, b: unknown) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime())
          
          const lastPayment = recentPayments?.[0]

          // Check if rent is already paid for current period
          const isCurrentMonthPaid = lastPayment && 
            new Date(lastPayment.paidDate).getMonth() === currentMonth &&
            new Date(lastPayment.paidDate).getFullYear() === currentYear

          // Skip if already paid for current month
          if (isCurrentMonthPaid) return

          // Determine alert type and severity
          let alertType: 'upcoming' | 'overdue' | 'due_today'
          let severity: 'info' | 'warning' | 'error'
          let title: string
          let message: string

          if (daysFromDue < 0) {
            // Overdue
            alertType = 'overdue'
            severity = 'error'
            title = `Rent Overdue - ${Math.abs(daysFromDue)} days`
            message = `${lease.tenant.name} at ${lease.unit.property.name} Unit ${lease.unit.unitNumber} is ${Math.abs(daysFromDue)} days overdue on rent payment.`
          } else if (daysFromDue === 0) {
            // Due today
            alertType = 'due_today'
            severity = 'warning'
            title = 'Rent Due Today'
            message = `${lease.tenant.name} at ${lease.unit.property.name} Unit ${lease.unit.unitNumber} has rent due today.`
          } else if (daysFromDue <= 7) {
            // Due within a week
            alertType = 'upcoming'
            severity = daysFromDue <= 3 ? 'warning' : 'info'
            title = `Rent Due in ${daysFromDue} day${daysFromDue > 1 ? 's' : ''}`
            message = `${lease.tenant.name} at ${lease.unit.property.name} Unit ${lease.unit.unitNumber} has rent due in ${daysFromDue} day${daysFromDue > 1 ? 's' : ''}.`
          } else {
            // Not urgent, skip
            return
          }

          alerts.push({
            id: `rent-alert-${lease.id}`,
            type: alertType,
            severity,
            title,
            message,
            dueDate: currentDueDate.toISOString(),
            daysFromDue,
            tenant: {
              id: lease.tenant.id,
              name: lease.tenant.name,
              email: lease.tenant.email
            },
            property: {
              id: lease.unit.property.id,
              name: lease.unit.property.name
            },
            unit: {
              id: lease.unit.id,
              unitNumber: lease.unit.unitNumber
            },
            lease: {
              id: lease.id,
              rentAmount: lease.rentAmount,
              dueDay: lease.dueDay
            },
            lastPayment: lastPayment ? {
              id: lastPayment.id,
              amount: lastPayment.amount,
              paidDate: lastPayment.paidDate,
              status: lastPayment.status
            } : undefined
          })
        })

        // Sort alerts by urgency (overdue first, then by days from due)
        alerts.sort((a, b) => {
          if (a.severity === 'error' && b.severity !== 'error') return -1
          if (b.severity === 'error' && a.severity !== 'error') return 1
          if (a.severity === 'warning' && b.severity === 'info') return -1
          if (b.severity === 'warning' && a.severity === 'info') return 1
          return a.daysFromDue - b.daysFromDue
        })

        return alerts

      } catch (error) {
        console.error('Error generating rent alerts:', error)
        return []
      }
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 15, // Refetch every 15 minutes
    staleTime: 1000 * 60 * 10, // Consider stale after 10 minutes
  })
}

export function useRentAlertCounts() {
  const { data: alerts = [] } = useUpcomingRentAlerts()

  return {
    total: alerts.length,
    overdue: alerts.filter(a => a.type === 'overdue').length,
    dueToday: alerts.filter(a => a.type === 'due_today').length,
    upcoming: alerts.filter(a => a.type === 'upcoming').length,
    critical: alerts.filter(a => a.severity === 'error').length,
    warnings: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length
  }
}