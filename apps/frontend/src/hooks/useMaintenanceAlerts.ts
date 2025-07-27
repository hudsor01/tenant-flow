// Safe version of maintenance alerts that handles missing foreign keys
import { useMemo } from 'react'
import { useMaintenanceRequests } from '@/hooks/useMaintenance'
import { useAuth } from '@/hooks/useAuth'
import type { RouterOutputs } from '@tenantflow/shared'

type MaintenanceRequestListOutput = RouterOutputs['maintenance']['list']
type MaintenanceRequestItem = MaintenanceRequestListOutput['requests'][0]

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
		description?: string
		priority: string
		status: string
		unitId?: string
		unitNumber?: string
		propertyId?: string
		propertyName?: string
	}
}

export function useMaintenanceAlerts() {
	const { user } = useAuth()
	// Use Hono RPC hook to get maintenance requests
	const { data: requests = [], isLoading, error } = useMaintenanceRequests({
		status: 'IN_PROGRESS' // API expects single status, not array
	})

	// Transform maintenance requests into alerts
	const alerts = useMemo(() => {
		if (!user || !requests) return []

		// Handle the response structure from API
		const requestsList = Array.isArray(requests) ? requests : (requests as { requests?: MaintenanceRequestItem[] }).requests || []

		return requestsList.map((request: MaintenanceRequestItem): MaintenanceAlert => {
			const daysOld = Math.floor(
				(Date.now() - new Date(request.createdAt).getTime()) /
				(1000 * 60 * 60 * 24)
			)

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

			const title = getAlertTitle(type, request)
			const message = getAlertMessage(type, request, daysOld)

			return {
				id: request.id,
				type,
				severity,
				title,
				message,
				createdAt: request.createdAt,
				updatedAt: request.updatedAt || request.createdAt,
				priority: request.priority as MaintenanceAlert['priority'],
				status: request.status as MaintenanceAlert['status'],
				daysOld,
				request: {
					id: request.id,
					title: request.title,
					description: request.description || undefined,
					priority: request.priority,
					status: request.status,
					unitId: request.unitId || undefined,
					unitNumber: request.Unit?.unitNumber || undefined,
					propertyId: request.Unit?.Property?.id || undefined,
					propertyName: request.Unit?.Property?.name || undefined
				}
			}
		})
	}, [requests, user])

	// Get count of high priority alerts
	const highPriorityCount = useMemo(
		() => alerts.filter((alert: MaintenanceAlert) => alert.severity !== 'info').length,
		[alerts]
	)

	return {
		alerts,
		highPriorityCount,
		isLoading,
		error
	}
}

// Helper functions for alert content
function getAlertTitle(
	type: MaintenanceAlert['type'],
	request: { title: string }
): string {
	switch (type) {
		case 'emergency':
			return `Emergency: ${request.title}`
		case 'high_priority':
			return `High Priority: ${request.title}`
		case 'overdue':
			return `Overdue: ${request.title}`
		case 'new_request':
			return request.title
		default:
			return request.title
	}
}

function getAlertMessage(
	type: MaintenanceAlert['type'],
	request: {
		description: string
		Unit?: {
			unitNumber?: string
			Property?: {
				name: string
			}
		}
	},
	daysOld: number
): string {
	const location = request.Unit?.unitNumber 
		? `Unit ${request.Unit.unitNumber}` 
		: request.Unit?.Property?.name || 'Unknown location'

	switch (type) {
		case 'emergency':
			return `Emergency maintenance required at ${location}. Immediate action needed.`
		case 'high_priority':
			return `High priority maintenance at ${location}. Please address within 24 hours.`
		case 'overdue':
			return `This request at ${location} has been open for ${daysOld} days. Please follow up.`
		case 'new_request':
			return `New maintenance request at ${location}.`
		default:
			return `Maintenance request at ${location}.`
	}
}

// Separate hook for getting alert counts
export function useMaintenanceAlertCounts() {
	const { alerts } = useMaintenanceAlerts()
	
	return useMemo(() => {
		const counts = {
			emergency: 0,
			high_priority: 0,
			overdue: 0,
			new_request: 0
		}
		
		alerts.forEach((alert: MaintenanceAlert) => {
			counts[alert.type]++
		})
		
		return counts
	}, [alerts])
}