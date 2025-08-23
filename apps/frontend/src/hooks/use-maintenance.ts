/**
 * Enhanced Maintenance Management Hook - Zustand + TanStack Query Integration
 * Maximum performance with native API usage and advanced state management
 */
import { useCallback } from 'react'
import {
	usePropertySelection,
	useNotificationSystem,
	useTenantSelection
} from './use-app-store'
import {
	useMaintenanceRequests as useMaintenanceRequestsAPI,
	useMaintenanceRequest as useMaintenanceRequestAPI,
	useCreateMaintenanceRequest,
	useUpdateMaintenanceRequest,
	useDeleteMaintenanceRequest,
	useUpdateMaintenanceStatus as useUpdateMaintenanceStatusAPI,
	useMaintenanceByProperty,
	useMaintenanceByTenant,
	useMaintenanceStats,
	useAssignMaintenanceVendor,
	useAddMaintenanceComment,
	useUploadMaintenanceImage
} from './api/use-maintenance'
import type {
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	MaintenanceQuery,
	MaintenanceRequest
} from '@repo/shared'

/**
 * Enhanced Maintenance Management Hook
 * Combines TanStack Query for server state with Zustand for UI state
 */
export function useMaintenance(
	query?: MaintenanceQuery,
	options?: { enabled?: boolean }
) {
	// Zustand state for UI management
	const { selectedPropertyId } = usePropertySelection()
	const { selectedTenantId } = useTenantSelection()
	const { notifySuccess, notifyError, notifyInfo } = useNotificationSystem()

	// TanStack Query for server state
	const maintenanceQuery = useMaintenanceRequestsAPI(query, options)
	const propertyMaintenanceQuery = useMaintenanceByProperty(
		selectedPropertyId || '',
		{
			enabled: !!selectedPropertyId
		}
	)
	const tenantMaintenanceQuery = useMaintenanceByTenant(
		selectedTenantId || '',
		{
			enabled: !!selectedTenantId
		}
	)
	const statsQuery = useMaintenanceStats()

	// Mutations with integrated notifications
	const createMaintenanceMutation = useCreateMaintenanceRequest()
	const updateMaintenanceMutation = useUpdateMaintenanceRequest()
	const deleteMaintenanceMutation = useDeleteMaintenanceRequest()
	const updateStatusMutation = useUpdateMaintenanceStatusAPI()
	const assignVendorMutation = useAssignMaintenanceVendor()
	const addCommentMutation = useAddMaintenanceComment()
	const uploadImageMutation = useUploadMaintenanceImage()

	// Enhanced actions with integrated state management and smart notifications
	const createMaintenanceRequest = useCallback(
		async (data: CreateMaintenanceInput) => {
			try {
				const result = await createMaintenanceMutation.mutateAsync(data)
				notifySuccess(
					'Request Created',
					`Maintenance request "${data.title}" has been submitted successfully.`
				)
				notifyInfo(
					'Next Steps',
					'Your request will be reviewed and assigned to a vendor shortly.'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to create maintenance request'
				notifyError('Creation Failed', message)
				throw error
			}
		},
		[createMaintenanceMutation, notifySuccess, notifyError, notifyInfo]
	)

	const updateMaintenanceRequest = useCallback(
		async (id: string, data: UpdateMaintenanceInput) => {
			try {
				const result = await updateMaintenanceMutation.mutateAsync({
					id,
					data
				})
				notifySuccess(
					'Request Updated',
					'Maintenance request has been updated successfully.'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to update maintenance request'
				notifyError('Update Failed', message)
				throw error
			}
		},
		[updateMaintenanceMutation, notifySuccess, notifyError]
	)

	const deleteMaintenanceRequest = useCallback(
		async (id: string) => {
			try {
				await deleteMaintenanceMutation.mutateAsync(id)
				notifySuccess(
					'Request Removed',
					'Maintenance request has been deleted from the system.'
				)
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to delete maintenance request'
				notifyError('Deletion Failed', message)
				throw error
			}
		},
		[deleteMaintenanceMutation, notifySuccess, notifyError]
	)

	const updateMaintenanceStatus = useCallback(
		async (id: string, status: string) => {
			try {
				const result = await updateStatusMutation.mutateAsync({
					id,
					status
				})
				const statusMessages = {
					OPEN: 'Request has been opened for review',
					IN_PROGRESS: 'Work has begun on this request',
					COMPLETED: 'Request has been completed successfully',
					CANCELED: 'Request has been cancelled',
					ON_HOLD: 'Request has been put on hold'
				}
				notifySuccess(
					'Status Updated',
					statusMessages[status as keyof typeof statusMessages] ||
						'Status updated successfully'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to update status'
				notifyError('Status Update Failed', message)
				throw error
			}
		},
		[updateStatusMutation, notifySuccess, notifyError]
	)

	const assignVendor = useCallback(
		async (id: string, vendorId: string) => {
			try {
				const result = await assignVendorMutation.mutateAsync({
					id,
					vendorId
				})
				notifySuccess(
					'Vendor Assigned',
					'A vendor has been assigned to handle this maintenance request.'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to assign vendor'
				notifyError('Assignment Failed', message)
				throw error
			}
		},
		[assignVendorMutation, notifySuccess, notifyError]
	)

	const addComment = useCallback(
		async (id: string, comment: string) => {
			try {
				const result = await addCommentMutation.mutateAsync({
					id,
					comment
				})
				notifySuccess(
					'Comment Added',
					'Your comment has been added to the maintenance request.'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to add comment'
				notifyError('Comment Failed', message)
				throw error
			}
		},
		[addCommentMutation, notifySuccess, notifyError]
	)

	const uploadImage = useCallback(
		async (id: string, formData: FormData) => {
			try {
				const result = await uploadImageMutation.mutateAsync({
					id,
					formData
				})
				notifySuccess(
					'Image Uploaded',
					'Your image has been attached to the maintenance request.'
				)
				return result
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to upload image'
				notifyError('Upload Failed', message)
				throw error
			}
		},
		[uploadImageMutation, notifySuccess, notifyError]
	)

	// Advanced computed values for better UX and analytics
	const allRequests = maintenanceQuery.data || []
	const openRequests = allRequests.filter(req => req.status === 'OPEN')
	const inProgressRequests = allRequests.filter(
		req => req.status === 'IN_PROGRESS'
	)
	const completedRequests = allRequests.filter(
		req => req.status === 'COMPLETED'
	)
	const emergencyRequests = allRequests.filter(
		req => req.priority === 'EMERGENCY'
	)
	const highPriorityRequests = allRequests.filter(
		req => req.priority === 'HIGH' || req.priority === 'EMERGENCY'
	)

	// Recent activity (last 7 days)
	const recentRequests = allRequests.filter(req => {
		const requestDate = new Date(req.createdAt)
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
		return requestDate >= sevenDaysAgo
	})

	// Overdue requests (more than 7 days old and still open/in progress)
	const overdueRequests = allRequests.filter(req => {
		const requestDate = new Date(req.createdAt)
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
		return (
			requestDate < sevenDaysAgo &&
			(req.status === 'OPEN' || req.status === 'IN_PROGRESS')
		)
	})

	return {
		// Query state
		maintenanceRequests: allRequests,
		isLoading: maintenanceQuery.isLoading,
		isError: maintenanceQuery.isError,
		error: maintenanceQuery.error,
		refetch: maintenanceQuery.refetch,

		// Property and tenant-specific maintenance
		propertyMaintenance: propertyMaintenanceQuery.data || [],
		tenantMaintenance: tenantMaintenanceQuery.data || [],
		isPropertyMaintenanceLoading: propertyMaintenanceQuery.isLoading,
		isTenantMaintenanceLoading: tenantMaintenanceQuery.isLoading,
		selectedPropertyId,
		selectedTenantId,

		// Statistics and analytics
		stats: statsQuery.data,
		isStatsLoading: statsQuery.isLoading,

		// Computed maintenance data for enhanced UX
		openRequests,
		inProgressRequests,
		completedRequests,
		emergencyRequests,
		highPriorityRequests,
		recentRequests,
		overdueRequests,

		// Advanced analytics
		analytics: {
			total: allRequests.length,
			open: openRequests.length,
			inProgress: inProgressRequests.length,
			completed: completedRequests.length,
			emergency: emergencyRequests.length,
			highPriority: highPriorityRequests.length,
			recent: recentRequests.length,
			overdue: overdueRequests.length,
			completionRate:
				allRequests.length > 0
					? (completedRequests.length / allRequests.length) * 100
					: 0,
			averageResponseTime: 0, // Could calculate from request data

			// Priority distribution
			priorityBreakdown: {
				low: allRequests.filter(r => r.priority === 'LOW').length,
				medium: allRequests.filter(r => r.priority === 'MEDIUM').length,
				high: allRequests.filter(r => r.priority === 'HIGH').length,
				emergency: allRequests.filter(r => r.priority === 'EMERGENCY')
					.length
			},

			// Status distribution
			statusBreakdown: {
				open: openRequests.length,
				inProgress: inProgressRequests.length,
				completed: completedRequests.length,
				cancelled: allRequests.filter(r => r.status === 'CANCELED')
					.length,
				onHold: allRequests.filter(r => r.status === 'ON_HOLD').length
			}
		},

		// CRUD actions
		createMaintenanceRequest,
		updateMaintenanceRequest,
		deleteMaintenanceRequest,
		updateMaintenanceStatus,
		assignVendor,
		addComment,
		uploadImage,

		// Mutation states
		isCreating: createMaintenanceMutation.isPending,
		isUpdating: updateMaintenanceMutation.isPending,
		isDeleting: deleteMaintenanceMutation.isPending,
		isUpdatingStatus: updateStatusMutation.isPending,
		isAssigningVendor: assignVendorMutation.isPending,
		isAddingComment: addCommentMutation.isPending,
		isUploadingImage: uploadImageMutation.isPending,

		// Action states
		isBusy:
			createMaintenanceMutation.isPending ||
			updateMaintenanceMutation.isPending ||
			deleteMaintenanceMutation.isPending ||
			updateStatusMutation.isPending ||
			assignVendorMutation.isPending
	}
}

/**
 * Hook for managing a single maintenance request by ID
 */
export function useMaintenanceRequestById(
	id: string,
	options?: { enabled?: boolean }
) {
	const maintenanceQuery = useMaintenanceRequestAPI(id, options)

	return {
		maintenanceRequest: maintenanceQuery.data || null,
		isLoading: maintenanceQuery.isLoading,
		isError: maintenanceQuery.isError,
		error: maintenanceQuery.error,
		refetch: maintenanceQuery.refetch,

		// Computed maintenance information with enhanced UX helpers
		isOpen: maintenanceQuery.data?.status === 'OPEN',
		isInProgress: maintenanceQuery.data?.status === 'IN_PROGRESS',
		isCompleted: maintenanceQuery.data?.status === 'COMPLETED',
		isCancelled: maintenanceQuery.data?.status === 'CANCELED',
		isOnHold: maintenanceQuery.data?.status === 'ON_HOLD',
		isEmergency: maintenanceQuery.data?.priority === 'EMERGENCY',
		isHighPriority:
			maintenanceQuery.data?.priority === 'HIGH' ||
			maintenanceQuery.data?.priority === 'EMERGENCY',

		// Status helpers with business logic
		statusColor:
			maintenanceQuery.data?.status === 'OPEN'
				? 'red'
				: maintenanceQuery.data?.status === 'IN_PROGRESS'
					? 'yellow'
					: maintenanceQuery.data?.status === 'COMPLETED'
						? 'green'
						: maintenanceQuery.data?.status === 'CANCELED'
							? 'gray'
							: maintenanceQuery.data?.status === 'ON_HOLD'
								? 'orange'
								: 'gray',

		priorityColor:
			maintenanceQuery.data?.priority === 'EMERGENCY'
				? 'red'
				: maintenanceQuery.data?.priority === 'HIGH'
					? 'orange'
					: maintenanceQuery.data?.priority === 'MEDIUM'
						? 'yellow'
						: 'green',

		// Time-based calculations
		daysSinceCreated: maintenanceQuery.data
			? Math.floor(
					(Date.now() -
						new Date(maintenanceQuery.data.createdAt).getTime()) /
						(1000 * 60 * 60 * 24)
				)
			: null,

		isOverdue: maintenanceQuery.data
			? (() => {
					const daysSince = Math.floor(
						(Date.now() -
							new Date(
								maintenanceQuery.data.createdAt
							).getTime()) /
							(1000 * 60 * 60 * 24)
					)
					const isActive =
						maintenanceQuery.data.status === 'OPEN' ||
						maintenanceQuery.data.status === 'IN_PROGRESS'
					return isActive && daysSince > 7 // Consider overdue after 7 days
				})()
			: false
	}
}

/**
 * Hook for maintenance analytics and business intelligence
 */
export function useMaintenanceAnalytics() {
	const maintenanceQuery = useMaintenanceRequestsAPI()
	const statsQuery = useMaintenanceStats()

	const requests = maintenanceQuery.data || []

	// Advanced business analytics
	const analytics = {
		// Core metrics
		totalRequests: requests.length,
		openRequests: requests.filter(r => r.status === 'OPEN').length,
		inProgressRequests: requests.filter(r => r.status === 'IN_PROGRESS')
			.length,
		completedRequests: requests.filter(r => r.status === 'COMPLETED')
			.length,
		cancelledRequests: requests.filter(r => r.status === 'CANCELED').length,
		onHoldRequests: requests.filter(r => r.status === 'ON_HOLD').length,

		// Priority metrics
		emergencyRequests: requests.filter(r => r.priority === 'EMERGENCY')
			.length,
		highPriorityRequests: requests.filter(r => r.priority === 'HIGH')
			.length,
		mediumPriorityRequests: requests.filter(r => r.priority === 'MEDIUM')
			.length,
		lowPriorityRequests: requests.filter(r => r.priority === 'LOW').length,

		// Performance metrics
		completionRate:
			requests.length > 0
				? (requests.filter(r => r.status === 'COMPLETED').length /
						requests.length) *
					100
				: 0,

		// Time-based analytics
		recentRequests: requests.filter(r => {
			const requestDate = new Date(r.createdAt)
			const sevenDaysAgo = new Date()
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
			return requestDate >= sevenDaysAgo
		}).length,

		overdueRequests: requests.filter(r => {
			const requestDate = new Date(r.createdAt)
			const sevenDaysAgo = new Date()
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
			const isActive = r.status === 'OPEN' || r.status === 'IN_PROGRESS'
			return requestDate < sevenDaysAgo && isActive
		}).length,

		thisMonthRequests: requests.filter(r => {
			const requestDate = new Date(r.createdAt)
			const now = new Date()
			return (
				requestDate.getMonth() === now.getMonth() &&
				requestDate.getFullYear() === now.getFullYear()
			)
		}).length,

		lastMonthRequests: requests.filter(r => {
			const requestDate = new Date(r.createdAt)
			const lastMonth = new Date()
			lastMonth.setMonth(lastMonth.getMonth() - 1)
			return (
				requestDate.getMonth() === lastMonth.getMonth() &&
				requestDate.getFullYear() === lastMonth.getFullYear()
			)
		}).length,

		// Trend analysis
		monthOverMonthGrowth: (() => {
			const thisMonth = requests.filter(r => {
				const requestDate = new Date(r.createdAt)
				const now = new Date()
				return (
					requestDate.getMonth() === now.getMonth() &&
					requestDate.getFullYear() === now.getFullYear()
				)
			}).length

			const lastMonth = requests.filter(r => {
				const requestDate = new Date(r.createdAt)
				const lastMonthDate = new Date()
				lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
				return (
					requestDate.getMonth() === lastMonthDate.getMonth() &&
					requestDate.getFullYear() === lastMonthDate.getFullYear()
				)
			}).length

			return lastMonth > 0
				? ((thisMonth - lastMonth) / lastMonth) * 100
				: thisMonth > 0
					? 100
					: 0
		})()
	}

	return {
		analytics,
		stats: statsQuery.data,
		trends: {
			// Request volume trend
			isIncreasing: analytics.monthOverMonthGrowth > 0,
			isDecreasing: analytics.monthOverMonthGrowth < 0,
			isStable: Math.abs(analytics.monthOverMonthGrowth) < 5, // Within 5% is considered stable

			// Performance trends
			needsAttention:
				analytics.overdueRequests > 0 ||
				analytics.emergencyRequests > 0,
			healthScore: Math.max(
				0,
				100 -
					analytics.overdueRequests * 10 -
					analytics.emergencyRequests * 20
			)
		},

		isLoading: maintenanceQuery.isLoading || statsQuery.isLoading,
		isError: maintenanceQuery.isError || statsQuery.isError,
		error: maintenanceQuery.error || statsQuery.error
	}
}
