'use client'

import { createClient } from '@/utils/supabase/client'
import type { Database, TenantStats, TenantWithLeaseInfo } from '@repo/shared'
import {
	useMutation,
	useQuery,
	useQueryClient,
	type QueryFunction
} from '@tanstack/react-query'
import { dashboardKeys } from './use-dashboard'

type _Tenant = Database['public']['Tables']['Tenant']['Row']

type InsertTenant = Database['public']['Tables']['Tenant']['Insert']

type UpdateTenant = Database['public']['Tables']['Tenant']['Update']

const supabase = createClient()

export function useTenants(status?: string) {
	const key = ['tenants-analytics', status ?? 'ALL'] as [string, string]
	const listFn: QueryFunction<
		TenantWithLeaseInfo[],
		[string, string]
	> = async () => {
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) throw new Error('Not authenticated')

		// Get tenants with their lease info via join
		const { data, error } = await supabase
			.from('Tenant')
			.select(`
				*,
				Leases:Lease(
					id,
					startDate,
					endDate,
					monthlyRent,
					securityDeposit,
					status,
					terms,
					Unit(
						id,
						unitNumber,
						bedrooms,
						bathrooms,
						squareFeet,
						Property(
							id,
							name,
							address,
							city,
							state,
							zipCode
						)
					)
				)
			`)
			.eq('userId', user.id)
			.order('createdAt', { ascending: false })

		if (error) throw error

		// Transform to match TenantWithLeaseInfo shape
		const transformedData = (data || []).map(tenant => {
			const lease = tenant.Leases?.[0]
			const unit = lease?.Unit
			const property = unit?.Property

			return {
				// Base tenant fields
				id: tenant.id,
				name: tenant.name,
				email: tenant.email,
				phone: tenant.phone,
				avatarUrl: tenant.avatarUrl,
				emergencyContact: tenant.emergencyContact,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,

				// Current lease information
				currentLease: lease ? {
					id: lease.id,
					startDate: lease.startDate,
					endDate: lease.endDate,
					rentAmount: lease.monthlyRent || 0,
					securityDeposit: lease.securityDeposit || 0,
					status: lease.status,
					terms: lease.terms
				} : null,

				// Unit information
				unit: unit ? {
					id: unit.id,
					unitNumber: unit.unitNumber,
					bedrooms: unit.bedrooms,
					bathrooms: unit.bathrooms,
					squareFootage: unit.squareFeet
				} : null,

				// Property information
				property: property ? {
					id: property.id,
					name: property.name,
					address: property.address,
					city: property.city,
					state: property.state,
					zipCode: property.zipCode
				} : null,

				// Derived fields for UI display
				monthlyRent: lease?.monthlyRent || 0,
				leaseStatus: lease?.status || 'NO_LEASE',
				paymentStatus: 'CURRENT', // Default - would need payment data to determine
				unitDisplay: unit ? `${property?.name || 'Unknown'} - ${unit.unitNumber}` : 'No Unit',
				propertyDisplay: property?.name || 'No Property',
				leaseStart: lease?.startDate || null,
				leaseEnd: lease?.endDate || null
			}
		}) as TenantWithLeaseInfo[]

		return transformedData
	}

	// Cast to loosen React Query's generic inference for this enriched shape
	// Loosen types to avoid React Query overload mismatch in strict TS; data shape is TenantWithLeaseInfo[]
	const result = (useQuery as typeof useQuery)({
		queryKey: key,
		queryFn: listFn
	}) as { data: TenantWithLeaseInfo[] | undefined; isLoading: boolean }
	return result
}

// Enhanced hook with select transformation for table-ready tenants data
export function useTenantsFormatted(status?: string) {
	return useQuery({
		queryKey: ['tenants', status ?? 'ALL'],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			// Get tenants with their lease info
			const { data, error } = await supabase
				.from('Tenant')
				.select(`
					*,
					Leases:Lease(
						id,
						startDate,
						endDate,
						monthlyRent,
						securityDeposit,
						status,
						terms,
						Unit(
							id,
							unitNumber,
							bedrooms,
							bathrooms,
							squareFeet,
							Property(
								id,
								name,
								address,
								city,
								state,
								zipCode
							)
						)
					)
				`)
				.eq('userId', user.id)
				.order('createdAt', { ascending: false })

			if (error) throw error

			// Transform to match TenantWithLeaseInfo shape
			return (data || []).map(tenant => {
				const lease = tenant.Leases?.[0]
				const unit = lease?.Unit
				const property = unit?.Property

				return {
					// Base tenant fields
					id: tenant.id,
					name: tenant.name,
					email: tenant.email,
					phone: tenant.phone,
					avatarUrl: tenant.avatarUrl,
					emergencyContact: tenant.emergencyContact,
					createdAt: tenant.createdAt,
					updatedAt: tenant.updatedAt,

					// Current lease information
					currentLease: lease ? {
						id: lease.id,
						startDate: lease.startDate,
						endDate: lease.endDate,
						rentAmount: lease.monthlyRent || 0,
						securityDeposit: lease.securityDeposit || 0,
						status: lease.status,
						terms: lease.terms
					} : null,

					// Unit information
					unit: unit ? {
						id: unit.id,
						unitNumber: unit.unitNumber,
						bedrooms: unit.bedrooms,
						bathrooms: unit.bathrooms,
						squareFootage: unit.squareFeet
					} : null,

					// Property information
					property: property ? {
						id: property.id,
						name: property.name,
						address: property.address,
						city: property.city,
						state: property.state,
						zipCode: property.zipCode
					} : null,

					// Derived fields for UI display
					monthlyRent: lease?.monthlyRent || 0,
					leaseStatus: lease?.status || 'NO_LEASE',
					paymentStatus: 'CURRENT', // Default - would need payment data to determine
					unitDisplay: unit ? `${property?.name || 'Unknown'} - ${unit.unitNumber}` : 'No Unit',
					propertyDisplay: property?.name || 'No Property',
					leaseStart: lease?.startDate || null,
					leaseEnd: lease?.endDate || null
				}
			}) as TenantWithLeaseInfo[]
		},
		select: (data: TenantWithLeaseInfo[]) => ({
			tenants: data.map((tenant: TenantWithLeaseInfo) => ({
				...tenant,
				// Format display values (replaces useMemo in table components)
				displayName: tenant.name,
				displayEmail: tenant.email.toLowerCase(),
				displayPhone: tenant.phone ? formatPhoneNumber(tenant.phone) : 'N/A',
				// Use actual status from backend or infer from lease data
				statusDisplay: determineStatusDisplay(tenant),
				statusColor: getTenantStatusColor(determineStatus(tenant)),
				// Format dates for display
				createdAtFormatted: new Date(tenant.createdAt).toLocaleDateString(),
				updatedAtFormatted: new Date(tenant.updatedAt).toLocaleDateString(),
				// Calculate tenant tenure for sorting/analytics
				tenureInDays: Math.floor(
					(Date.now() - new Date(tenant.createdAt).getTime()) /
						(1000 * 60 * 60 * 24)
				),
				// Avatar initials for display
				avatarInitials: tenant.name
					.split(' ')
					.map(n => n.charAt(0))
					.join('')
					.toUpperCase()
					.slice(0, 2)
			})),
			// Summary statistics from actual data
			summary: {
				total: data.length,
				active: data.filter(tenant => determineStatus(tenant) === 'ACTIVE').length,
				byStatus: data.reduce((acc, tenant) => {
					const status = determineStatus(tenant)
					acc[status] = (acc[status] || 0) + 1
					return acc
				}, {} as Record<string, number>),
				recentlyAdded: data.filter(tenant =>
					(Date.now() - new Date(tenant.createdAt).getTime()) < (7 * 24 * 60 * 60 * 1000)
				).length,
				withPhone: data.filter(tenant => tenant.phone).length,
				withEmergencyContact: data.filter(tenant => tenant.emergencyContact).length
			}
		})
	})
}

// Helper functions for consistent formatting
function formatPhoneNumber(phone: string): string {
	const cleaned = phone.replace(/\D/g, '')
	if (cleaned.length === 10) {
		return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
	}
	return phone // Return original if not standard format
}

function determineStatus(tenant: TenantWithLeaseInfo): string {
	// If tenant has active lease info, determine status from lease
	if (tenant.currentLease?.endDate) {
		const leaseEndDate = new Date(tenant.currentLease.endDate)
		const now = new Date()

		if (leaseEndDate < now) {
			return 'INACTIVE' // Lease has ended
		}

		// Check if lease is ending soon (within 30 days)
		const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
		if (leaseEndDate < thirtyDaysFromNow) {
			return 'PENDING' // Lease ending soon
		}

		return 'ACTIVE'
	}

	// If no active lease info, check tenant creation date
	const createdDate = new Date(tenant.createdAt)
	const daysSinceCreation = (Date.now() - createdDate.getTime()) / (24 * 60 * 60 * 1000)

	if (daysSinceCreation < 7) {
		return 'PENDING' // Recently added, possibly still onboarding
	}

	return 'ACTIVE' // Default to active
}

function determineStatusDisplay(tenant: TenantWithLeaseInfo): string {
	const status = determineStatus(tenant)
	const statusDisplayMap: Record<string, string> = {
		ACTIVE: 'Active',
		INACTIVE: 'Inactive',
		PENDING: 'Pending',
		EVICTED: 'Evicted'
	}
	return statusDisplayMap[status] || 'Active'
}

function getTenantStatusColor(status?: string): string {
	const colorMap: Record<string, string> = {
		ACTIVE: 'hsl(var(--primary))', // use primary for active
		INACTIVE: 'hsl(var(--muted-foreground))', // use muted for inactive
		PENDING: 'hsl(var(--accent))', // use accent for pending
		EVICTED: 'hsl(var(--destructive))' // use destructive for evicted
	}
	return colorMap[status || 'ACTIVE'] || 'hsl(var(--primary))'
}

export function useTenantStats() {
	return useQuery({
		queryKey: ['tenants', 'stats'],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			// Get tenant statistics
			const { data, error } = await supabase
				.from('Tenant')
				.select('id, createdAt, Leases:Lease(status)')
				.eq('userId', user.id)

			if (error) throw error

			const tenants = data || []
			const now = new Date()

			const activeTenants = tenants.filter(t =>
				t.Leases?.some((l) => l.status === 'ACTIVE')
			).length
			const newTenants = tenants.filter(t => {
				const daysSinceCreation = (now.getTime() - new Date(t.createdAt).getTime()) / (24 * 60 * 60 * 1000)
				return daysSinceCreation <= 30
			}).length

			return {
				total: tenants.length,
				active: activeTenants,
				inactive: tenants.length - activeTenants,
				newThisMonth: newTenants,
				new: newTenants,
				churnRate: 0 // Would need historical data to calculate
			} as TenantStats
		}
	})
}

export function useCreateTenant() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (values: InsertTenant) => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('Tenant')
				.insert({ ...values, userId: user.id })
				.select()
				.single()

			if (error) throw error
			return data
		},
		onMutate: async newTenant => {
			// Cancel outgoing refetches to prevent optimistic update conflicts
			await qc.cancelQueries({ queryKey: ['tenants'] })

			// Snapshot previous value for rollback
			const previousTenants = qc.getQueryData(['tenants', 'ALL'])

			// Optimistically update cache with new tenant
			qc.setQueryData(['tenants', 'ALL'], (old: _Tenant[] | undefined) => {
				const optimisticTenant: _Tenant = {
					id: `temp-${Date.now()}`, // Temporary ID until server response
					...newTenant,
					firstName: newTenant.firstName || null,
					lastName: newTenant.lastName || null,
					name: newTenant.name || null,
					avatarUrl: newTenant.avatarUrl || null,
					phone: newTenant.phone || null,
					emergencyContact: newTenant.emergencyContact || null,
					userId: newTenant.userId || null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
				return old ? [...old, optimisticTenant] : [optimisticTenant]
			})

			// Update stats optimistically
			qc.setQueriesData(
				{ queryKey: ['tenants', 'stats'] },
				(old: TenantStats | undefined) => {
					if (old) {
						return {
							...old,
							total: (old.total || 0) + 1,
							active: (old.active || 0) + 1
						}
					}
					return old
				}
			)

			// Return context for rollback
			return { previousTenants }
		},
		onError: (_err, _newTenant, context) => {
			// Rollback optimistic updates on error
			if (context?.previousTenants) {
				qc.setQueryData(['tenants', 'ALL'], context.previousTenants)
			}
			// Also refresh stats to ensure consistency
			qc.invalidateQueries({ queryKey: ['tenants', 'stats'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		},
		onSuccess: () => {
			// Refresh all tenant queries to get server data
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useUpdateTenant() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, values }: { id: string; values: UpdateTenant }) => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('Tenant')
				.update(values)
				.eq('id', id)
				.eq('userId', user.id) // RLS check
				.select()
				.single()

			if (error) throw error
			return data
		},
		onMutate: async ({ id, values }) => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['tenants'] })

			// Snapshot previous value
			const previousTenants = qc.getQueryData(['tenants', 'ALL'])
			const previousStats = qc.getQueryData(['tenants', 'stats'])

			// Optimistically update tenant in cache
			qc.setQueryData(['tenants', 'ALL'], (old: _Tenant[] | undefined) => {
				if (!old) return old
				return old.map(tenant =>
					tenant.id === id
						? { ...tenant, ...values, updatedAt: new Date().toISOString() }
						: tenant
				)
			})

			return { previousTenants, previousStats }
		},
		onError: (_err, _variables, context) => {
			// Rollback optimistic updates
			if (context?.previousTenants) {
				qc.setQueryData(['tenants', 'ALL'], context.previousTenants)
			}
			if (context?.previousStats) {
				qc.setQueryData(['tenants', 'stats'], context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}

export function useDeleteTenant() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async (id: string) => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { error } = await supabase
				.from('Tenant')
				.delete()
				.eq('id', id)
				.eq('userId', user.id) // RLS check

			if (error) throw error
			return true
		},
		onMutate: async id => {
			// Cancel outgoing refetches
			await qc.cancelQueries({ queryKey: ['tenants'] })

			// Snapshot previous values
			const previousTenants = qc.getQueryData(['tenants', 'ALL']) as
				| _Tenant[]
				| undefined
			const previousStats = qc.getQueryData(['tenants', 'stats'])

			// Find the tenant being deleted for stats update
			const tenantToDelete = previousTenants?.find(t => t.id === id)

			// Optimistically remove tenant from cache
			qc.setQueryData(['tenants', 'ALL'], (old: _Tenant[] | undefined) => {
				if (!old) return old
				return old.filter(tenant => tenant.id !== id)
			})

			// Update stats optimistically
			if (tenantToDelete) {
				qc.setQueriesData(
					{ queryKey: ['tenants', 'stats'] },
					(old: TenantStats | undefined) => {
						if (!old) return old

						return {
							...old,
							total: Math.max(0, (old.total || 0) - 1),
							active: Math.max(0, (old.active || 0) - 1)
						}
					}
				)
			}

			return { previousTenants, previousStats, deletedTenant: tenantToDelete }
		},
		onError: (_err, _id, context) => {
			// Rollback optimistic updates
			if (context?.previousTenants) {
				qc.setQueryData(['tenants', 'ALL'], context.previousTenants)
			}
			if (context?.previousStats) {
				qc.setQueryData(['tenants', 'stats'], context.previousStats)
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tenants'] })
			qc.invalidateQueries({ queryKey: dashboardKeys.stats() })
		}
	})
}
