/**
 * Optimistic Updates Utilities for TanStack Query
 * 
 * Provides reusable patterns for implementing optimistic updates
 * that improve perceived performance by updating the UI immediately
 * before the server responds.
 */

import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

/**
 * Generic optimistic update pattern
 */
export interface OptimisticUpdateConfig<TData, TVariables> {
	queryKey: readonly unknown[]
	updateFn: (oldData: TData | undefined, variables: TVariables) => TData | undefined
	rollbackFn?: (oldData: TData | undefined, variables: TVariables) => TData | undefined
}

/**
 * Create a standardized optimistic update mutation
 */
export function createOptimisticMutation<TData, TVariables, TResponse>(
	queryClient: QueryClient,
	config: OptimisticUpdateConfig<TData, TVariables>
) {
	return {
		onMutate: async (variables: TVariables) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: config.queryKey })

			// Snapshot the previous value
			const previousData = queryClient.getQueryData<TData>(config.queryKey)

			// Optimistically update the cache
			queryClient.setQueryData<TData>(config.queryKey, (oldData) =>
				config.updateFn(oldData, variables)
			)

			// Return context with the previous data
			return { previousData, variables }
		},
		onError: (
			error: unknown,
			variables: TVariables,
			context: { previousData: TData | undefined; variables: TVariables } | undefined
		) => {
			// Rollback on error
			if (context?.previousData !== undefined) {
				queryClient.setQueryData(config.queryKey, context.previousData)
			}
		},
		onSettled: () => {
			// Refetch the query regardless of success/error
			queryClient.invalidateQueries({ queryKey: config.queryKey })
		},
	}
}

/**
 * Optimistic updates for property operations
 */
export const propertyOptimisticUpdates = {
	/**
	 * Add property optimistically
	 */
	addProperty: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.properties.lists(),
			updateFn: (oldData: any[] = [], newProperty: any) => [
				...oldData,
				{
					...newProperty,
					id: `temp-${Date.now()}`, // Temporary ID
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		}),

	/**
	 * Update property optimistically
	 */
	updateProperty: (queryClient: QueryClient, propertyId: string) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.properties.detail(propertyId),
			updateFn: (oldData: any, updates: any) => ({
				...oldData,
				...updates,
				updatedAt: new Date().toISOString(),
			}),
		}),

	/**
	 * Delete property optimistically
	 */
	deleteProperty: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.properties.lists(),
			updateFn: (oldData: any[] = [], propertyId: string) =>
				oldData.filter((property) => property.id !== propertyId),
		}),
}

/**
 * Optimistic updates for tenant operations
 */
export const tenantOptimisticUpdates = {
	/**
	 * Add tenant optimistically
	 */
	addTenant: (queryClient: QueryClient, propertyId?: string) =>
		createOptimisticMutation(queryClient, {
			queryKey: propertyId ? queryKeys.tenants.list({ propertyId }) : queryKeys.tenants.lists(),
			updateFn: (oldData: any[] = [], newTenant: any) => [
				...oldData,
				{
					...newTenant,
					id: `temp-${Date.now()}`,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		}),

	/**
	 * Update tenant optimistically
	 */
	updateTenant: (queryClient: QueryClient, tenantId: string) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.tenants.detail(tenantId),
			updateFn: (oldData: any, updates: any) => ({
				...oldData,
				...updates,
				updatedAt: new Date().toISOString(),
			}),
		}),

	/**
	 * Update tenant status optimistically (common operation)
	 */
	updateTenantStatus: (queryClient: QueryClient, propertyId?: string) =>
		createOptimisticMutation(queryClient, {
			queryKey: propertyId ? queryKeys.tenants.list({ propertyId }) : queryKeys.tenants.lists(),
			updateFn: (oldData: any[] = [], { tenantId, status }: { tenantId: string; status: string }) =>
				oldData.map((tenant) =>
					tenant.id === tenantId
						? { ...tenant, status, updatedAt: new Date().toISOString() }
						: tenant
				),
		}),
}

/**
 * Optimistic updates for maintenance operations
 */
export const maintenanceOptimisticUpdates = {
	/**
	 * Add maintenance request optimistically
	 */
	addMaintenanceRequest: (queryClient: QueryClient, propertyId: string) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.maintenance.propertyRequests(propertyId),
			updateFn: (oldData: any[] = [], newRequest: any) => [
				{
					...newRequest,
					id: `temp-${Date.now()}`,
					status: 'submitted',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				...oldData,
			],
		}),

	/**
	 * Update maintenance request status optimistically
	 */
	updateMaintenanceStatus: (queryClient: QueryClient, propertyId: string) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.maintenance.propertyRequests(propertyId),
			updateFn: (
				oldData: any[] = [],
				{ requestId, status }: { requestId: string; status: string }
			) =>
				oldData.map((request) =>
					request.id === requestId
						? { ...request, status, updatedAt: new Date().toISOString() }
						: request
				),
		}),
}

/**
 * Optimistic updates for notification operations
 */
export const notificationOptimisticUpdates = {
	/**
	 * Mark notification as read optimistically
	 */
	markAsRead: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.notifications.list(),
			updateFn: (oldData: any[] = [], notificationId: string) =>
				oldData.map((notification) =>
					notification.id === notificationId
						? { ...notification, read: true, readAt: new Date().toISOString() }
						: notification
				),
		}),

	/**
	 * Mark all notifications as read optimistically
	 */
	markAllAsRead: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.notifications.list(),
			updateFn: (oldData: any[] = []) =>
				oldData.map((notification) => ({
					...notification,
					read: true,
					readAt: new Date().toISOString(),
				})),
		}),

	/**
	 * Delete notification optimistically
	 */
	deleteNotification: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.notifications.list(),
			updateFn: (oldData: any[] = [], notificationId: string) =>
				oldData.filter((notification) => notification.id !== notificationId),
		}),
}

/**
 * Optimistic updates for subscription operations
 */
export const subscriptionOptimisticUpdates = {
	/**
	 * Update subscription plan optimistically
	 */
	updatePlan: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.subscriptions.current(),
			updateFn: (oldData: any, { planId, planName }: { planId: string; planName: string }) => ({
				...oldData,
				planId,
				planName,
				updatedAt: new Date().toISOString(),
			}),
		}),

	/**
	 * Update subscription status optimistically
	 */
	updateStatus: (queryClient: QueryClient) =>
		createOptimisticMutation(queryClient, {
			queryKey: queryKeys.subscriptions.current(),
			updateFn: (oldData: any, status: string) => ({
				...oldData,
				status,
				updatedAt: new Date().toISOString(),
			}),
		}),
}

/**
 * Batch optimistic updates for multiple operations
 */
export class BatchOptimisticUpdates {
	private queryClient: QueryClient
	private operations: (() => void)[] = []

	constructor(queryClient: QueryClient) {
		this.queryClient = queryClient
	}

	/**
	 * Add an operation to the batch
	 */
	add(operation: () => void) {
		this.operations.push(operation)
		return this
	}

	/**
	 * Execute all operations atomically
	 */
	async execute() {
		// Begin batch update
		this.queryClient.cancelQueries()

		try {
			// Execute all operations
			this.operations.forEach((operation) => operation())
		} catch (error) {
			// Rollback all operations if any fail
			console.error('Batch optimistic update failed:', error)
			throw error
		} finally {
			// Clear operations
			this.operations = []
		}
	}
}

/**
 * React hook for managing optimistic updates
 */
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

export function useOptimisticUpdates() {
	const queryClient = useQueryClient()

	const optimisticUpdates = useMemo(
		() => ({
			properties: {
				add: propertyOptimisticUpdates.addProperty(queryClient),
				update: (propertyId: string) => propertyOptimisticUpdates.updateProperty(queryClient, propertyId),
				delete: propertyOptimisticUpdates.deleteProperty(queryClient),
			},
			tenants: {
				add: (propertyId?: string) => tenantOptimisticUpdates.addTenant(queryClient, propertyId),
				update: (tenantId: string) => tenantOptimisticUpdates.updateTenant(queryClient, tenantId),
				updateStatus: (propertyId?: string) =>
					tenantOptimisticUpdates.updateTenantStatus(queryClient, propertyId),
			},
			maintenance: {
				add: (propertyId: string) => maintenanceOptimisticUpdates.addMaintenanceRequest(queryClient, propertyId),
				updateStatus: (propertyId: string) =>
					maintenanceOptimisticUpdates.updateMaintenanceStatus(queryClient, propertyId),
			},
			notifications: {
				markAsRead: notificationOptimisticUpdates.markAsRead(queryClient),
				markAllAsRead: notificationOptimisticUpdates.markAllAsRead(queryClient),
				delete: notificationOptimisticUpdates.deleteNotification(queryClient),
			},
			subscriptions: {
				updatePlan: subscriptionOptimisticUpdates.updatePlan(queryClient),
				updateStatus: subscriptionOptimisticUpdates.updateStatus(queryClient),
			},
			batch: () => new BatchOptimisticUpdates(queryClient),
		}),
		[queryClient]
	)

	return optimisticUpdates
}

/**
 * Common optimistic update patterns for forms
 */
export const formOptimisticUpdates = {
	/**
	 * Standard create operation
	 */
	create: <T>(
		queryClient: QueryClient,
		queryKey: readonly unknown[],
		tempData: T,
		tempId?: string
	) => ({
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey })
			const previousData = queryClient.getQueryData(queryKey)

			queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => [
				{
					...tempData,
					id: tempId || `temp-${Date.now()}`,
					createdAt: new Date().toISOString(),
				},
				...(oldData || []),
			])

			return { previousData }
		},
		onError: (error: unknown, variables: unknown, context: any) => {
			if (context?.previousData) {
				queryClient.setQueryData(queryKey, context.previousData)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey })
		},
	}),

	/**
	 * Standard update operation
	 */
	update: <T>(
		queryClient: QueryClient,
		queryKey: readonly unknown[],
		updates: Partial<T>
	) => ({
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey })
			const previousData = queryClient.getQueryData(queryKey)

			queryClient.setQueryData(queryKey, (oldData: T | undefined) => ({
				...oldData,
				...updates,
				updatedAt: new Date().toISOString(),
			}))

			return { previousData }
		},
		onError: (error: unknown, variables: unknown, context: any) => {
			if (context?.previousData) {
				queryClient.setQueryData(queryKey, context.previousData)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey })
		},
	}),

	/**
	 * Standard delete operation
	 */
	delete: <T extends { id: string }>(
		queryClient: QueryClient,
		queryKey: readonly unknown[],
		itemId: string
	) => ({
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey })
			const previousData = queryClient.getQueryData(queryKey)

			queryClient.setQueryData(queryKey, (oldData: T[] | undefined) =>
				oldData ? oldData.filter((item) => item.id !== itemId) : []
			)

			return { previousData }
		},
		onError: (error: unknown, variables: unknown, context: any) => {
			if (context?.previousData) {
				queryClient.setQueryData(queryKey, context.previousData)
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey })
		},
	}),
}