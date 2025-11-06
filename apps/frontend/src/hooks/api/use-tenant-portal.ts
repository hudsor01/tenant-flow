import { clientFetch } from '#lib/api/client'
import type {
	MaintenanceRequest,
	RentPayment
} from '@repo/shared/types/core'
import type { LeaseWithDetails } from '@repo/shared/types/relations'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TenantPortalDashboardResponse {
	tenant: {
		id: string
		firstName: string | null
		lastName: string | null
		email: string
		status: string
	}
	lease: LeaseWithDetails | null
	maintenance: {
		total: number
		open: number
		inProgress: number
		completed: number
		recent: MaintenanceRequest[]
	}
	payments: {
		recent: Array<
			RentPayment & {
				receiptUrl?: string | null
			}
		>
		upcoming: (RentPayment & { receiptUrl?: string | null }) | null
		totalPaidUsd: number
	}
}

export interface TenantPortalMaintenanceResponse {
	requests: MaintenanceRequest[]
	summary: {
		total: number
		open: number
		inProgress: number
		completed: number
	}
}

export interface TenantPortalPaymentsResponse {
	payments: Array<
		RentPayment & {
			receiptUrl: string | null
		}
	>
	methodsEndpoint: string
}

export interface TenantPortalDocumentsResponse {
	documents: Array<{
		id: string
		type: 'LEASE' | 'RECEIPT'
		name: string
		url: string | null
		createdAt: string | null
	}>
}

export const tenantPortalKeys = {
	root: ['tenant-portal'] as const,
	dashboard: () => [...tenantPortalKeys.root, 'dashboard'] as const,
	maintenance: () => [...tenantPortalKeys.root, 'maintenance'] as const,
	payments: () => [...tenantPortalKeys.root, 'payments'] as const,
	documents: () => [...tenantPortalKeys.root, 'documents'] as const
}

export function useTenantPortalDashboard() {
	return useQuery({
		queryKey: tenantPortalKeys.dashboard(),
		queryFn: async (): Promise<TenantPortalDashboardResponse> =>
			clientFetch('/api/v1/tenant-portal/dashboard'),
		staleTime: 60 * 1000
	})
}

export function useTenantPortalPayments() {
	return useQuery({
		queryKey: tenantPortalKeys.payments(),
		queryFn: async (): Promise<TenantPortalPaymentsResponse> =>
			clientFetch('/api/v1/tenant-portal/payments'),
		staleTime: 60 * 1000
	})
}

export function useTenantPortalDocuments() {
	return useQuery({
		queryKey: tenantPortalKeys.documents(),
		queryFn: async (): Promise<TenantPortalDocumentsResponse> =>
			clientFetch('/api/v1/tenant-portal/documents'),
		staleTime: 5 * 60 * 1000
	})
}

export function useCreateTenantMaintenanceRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (payload: {
			title: string
			description: string
			priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
			category?: string
		}) => {
			return clientFetch<MaintenanceRequest>('/api/v1/tenant-portal/maintenance', {
				method: 'POST',
				body: JSON.stringify(payload)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.dashboard() })
			queryClient.invalidateQueries({ queryKey: tenantPortalKeys.maintenance() })
		}
	})
}
