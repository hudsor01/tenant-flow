import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
// Note: Using 'any' types below for complex Supabase query results
// The data structures have nested arrays and complex relationships that vary
// ESLint disabled for this specific case of external API data processing

export interface Activity {
  id: string
  userId: string
  userName?: string
  action: string
  entityType: 'property' | 'tenant' | 'maintenance' | 'payment' | 'lease' | 'unit'
  entityId: string
  entityName?: string
  metadata?: Record<string, unknown>
  createdAt: string
  priority?: 'low' | 'medium' | 'high'
}

export function useActivityFeed(limit = 10) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['activityFeed', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return []

      // Production-ready activity aggregation from multiple data sources
      // This approach provides comprehensive activity tracking without requiring
      // database schema changes while maintaining performance through targeted queries
      
      const activities: Activity[] = []
      const batchLimit = Math.ceil(limit / 5) // Distribute limit across entity types

      try {
        // Parallel fetch of all activity sources for optimal performance
        const [
          propertiesResult,
          maintenanceResult,
          paymentsResult,
          leasesResult,
          tenantsResult
        ] = await Promise.allSettled([
          // Recent property activities
          supabase
            .from('Property')
            .select('id, name, createdAt, ownerId, owner:User(name)')
            .eq('ownerId', user.id)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Recent maintenance requests with unit and property context
          supabase
            .from('MaintenanceRequest')
            .select(`
              id, 
              title, 
              priority,
              status,
              createdAt,
              unit:Unit(
                unitNumber,
                property:Property(name, ownerId)
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Recent payments with lease and property context
          supabase
            .from('Payment')
            .select(`
              id,
              amount,
              type,
              status,
              createdAt,
              lease:Lease(
                rentAmount,
                tenant:Tenant(name),
                unit:Unit(
                  unitNumber,
                  property:Property(name, ownerId)
                )
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Recent lease activities
          supabase
            .from('Lease')
            .select(`
              id,
              status,
              startDate,
              endDate,
              createdAt,
              tenant:Tenant(name),
              unit:Unit(
                unitNumber,
                property:Property(name, ownerId)
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit),

          // Recent tenant activities (invitations, acceptances)
          supabase
            .from('Tenant')
            .select(`
              id,
              name,
              invitationStatus,
              invitedAt,
              acceptedAt,
              createdAt,
              leases:Lease(
                unit:Unit(
                  property:Property(name, ownerId)
                )
              )
            `)
            .order('createdAt', { ascending: false })
            .limit(batchLimit)
        ])

        // Process property activities
        if (propertiesResult.status === 'fulfilled' && propertiesResult.value.data && !propertiesResult.value.error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          propertiesResult.value.data.forEach((property: any) => {
            activities.push({
              id: `property-${property.id}`,
              userId: property.ownerId,
              userName: user.name || '',
              action: 'Created property',
              entityType: 'property',
              entityId: property.id,
              entityName: property.name,
              createdAt: typeof property.createdAt === 'string' ? property.createdAt : property.createdAt.toISOString(),
              priority: 'medium'
            })
          })
        }

        // Process maintenance request activities
        if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value.data) {
          maintenanceResult.value.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((req: any) => req.unit?.property?.ownerId === user.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .forEach((request: any) => {
              const priorityMap: Record<string, 'low' | 'medium' | 'high'> = { 
                'LOW': 'low', 
                'MEDIUM': 'medium', 
                'HIGH': 'high', 
                'EMERGENCY': 'high' 
              }
              activities.push({
                id: `maintenance-${request.id}`,
                userId: user.id,
                userName: user.name || '',
                action: `${request.status === 'COMPLETED' ? 'Completed' : 'Created'} maintenance request`,
                entityType: 'maintenance',
                entityId: request.id,
                entityName: request.title,
                metadata: { 
                  propertyName: request.unit?.property?.name,
                  unitNumber: request.unit?.unitNumber,
                  priority: request.priority,
                  status: request.status
                },
                createdAt: typeof request.createdAt === 'string' ? request.createdAt : request.createdAt.toISOString(),
                priority: priorityMap[request.priority] || 'medium'
              })
            })
        }

        // Process payment activities
        if (paymentsResult.status === 'fulfilled' && paymentsResult.value.data) {
          paymentsResult.value.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((payment: any) => payment.lease?.unit?.property?.ownerId === user.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .forEach((payment: any) => {
              activities.push({
                id: `payment-${payment.id}`,
                userId: user.id,
                userName: user.name || '',
                action: `${payment.status === 'COMPLETED' ? 'Received' : 'Recorded'} ${payment.type.toLowerCase()} payment`,
                entityType: 'payment',
                entityId: payment.id,
                entityName: `$${payment.amount}`,
                metadata: {
                  amount: payment.amount,
                  type: payment.type,
                  status: payment.status,
                  tenantName: undefined,
                  propertyName: payment.lease?.unit?.property?.name,
                  unitNumber: payment.lease?.unit?.unitNumber
                },
                createdAt: typeof payment.createdAt === 'string' ? payment.createdAt : payment.createdAt.toISOString(),
                priority: payment.status === 'FAILED' ? 'high' : 'medium'
              })
            })
        }

        // Process lease activities
        if (leasesResult.status === 'fulfilled' && leasesResult.value.data) {
          leasesResult.value.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((lease: any) => lease.unit?.property?.ownerId === user.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .forEach((lease: any) => {
              const isNewLease = new Date(lease.createdAt).getTime() === new Date(lease.startDate).getTime()
              activities.push({
                id: `lease-${lease.id}`,
                userId: user.id,
                userName: user.name || '',
                action: isNewLease ? 'Created lease agreement' : `Lease status: ${lease.status.toLowerCase()}`,
                entityType: 'lease',
                entityId: lease.id,
                entityName: `Lease - ${lease.unit?.property?.name || 'Unknown Property'}`,
                metadata: {
                  tenantName: undefined,
                  propertyName: lease.unit?.property?.name,
                  unitNumber: lease.unit?.unitNumber,
                  status: lease.status,
                  startDate: lease.startDate,
                  endDate: lease.endDate
                },
                createdAt: typeof lease.createdAt === 'string' ? lease.createdAt : lease.createdAt.toISOString(),
                priority: lease.status === 'EXPIRED' ? 'high' : 'medium'
              })
            })
        }

        // Process tenant activities
        if (tenantsResult.status === 'fulfilled' && tenantsResult.value.data) {
          tenantsResult.value.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((tenant: any) => tenant.leases?.some((lease: any) => lease.unit?.property?.ownerId === user.id))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .forEach((tenant: any) => {
              if (tenant.acceptedAt) {
                activities.push({
                  id: `tenant-accepted-${tenant.id}`,
                  userId: user.id,
                  userName: user.name || '',
                  action: 'Tenant accepted invitation',
                  entityType: 'tenant',
                  entityId: tenant.id,
                  entityName: tenant.name,
                  metadata: {
                    invitationStatus: tenant.invitationStatus,
                    acceptedAt: tenant.acceptedAt,
                    propertyName: tenant.leases?.[0]?.unit?.property?.name
                  },
                  createdAt: typeof tenant.acceptedAt === 'string' ? tenant.acceptedAt : tenant.acceptedAt.toISOString(),
                  priority: 'medium'
                })
              } else if (tenant.invitedAt && tenant.invitationStatus === 'PENDING') {
                activities.push({
                  id: `tenant-invited-${tenant.id}`,
                  userId: user.id,
                  userName: user.name || '',
                  action: 'Sent tenant invitation',
                  entityType: 'tenant',
                  entityId: tenant.id,
                  entityName: tenant.name,
                  metadata: {
                    invitationStatus: tenant.invitationStatus,
                    invitedAt: tenant.invitedAt,
                    propertyName: tenant.leases?.[0]?.unit?.property?.name
                  },
                  createdAt: tenant.invitedAt ? (typeof tenant.invitedAt === 'string' ? tenant.invitedAt : tenant.invitedAt.toISOString()) : new Date().toISOString(),
                  priority: 'low'
                })
              }
            })
        }

      } catch (error) {
        console.error('Error fetching activity feed:', error)
        // Return empty array on error to prevent UI crashes
        return []
      }

      // Sort all activities by date (most recent first) and apply limit
      const sortedActivities = activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)

      return sortedActivities
    },
    enabled: !!user?.id,
    // Removed aggressive polling - use global defaults (5 min stale time, no auto-refetch)
    // Real-time updates can be added later with Supabase real-time subscriptions if needed
  })
}