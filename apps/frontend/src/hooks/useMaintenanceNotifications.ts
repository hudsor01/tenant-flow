// Refactored: useMaintenanceNotifications now uses tRPC for backend calls instead of legacy apiClient

import { useMutation } from '@tanstack/react-query'
import { trpc } from '@/lib/trpcClient'
import { toast } from 'sonner'
import type { MaintenanceRequest } from '@/types/entities'

interface MaintenanceNotificationRequest {
	type: 'new_request' | 'status_update' | 'emergency_alert'
	maintenanceRequest: {
		id: string
		title: string
		description: string
		category: string
		priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
		status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
		createdAt: string
		unit: {
			unitNumber: string
			property: {
				name: string
				address: string
			}
		}
		tenant?: {
			name: string
			email: string
		}
	}
	recipient: {
		email: string
		name: string
		role: 'owner' | 'tenant'
	}
	actionUrl?: string
}

export function useSendMaintenanceNotification() {
	return useMutation({
		mutationFn: async (request: MaintenanceNotificationRequest) => {
			try {
				// Send maintenance notification via tRPC
				const notificationData = {
					type: request.type,
					maintenanceRequestId: request.maintenanceRequest.id,
					recipientEmail: request.recipient.email,
					recipientName: request.recipient.name,
					recipientRole: request.recipient.role,
					actionUrl: request.actionUrl || `${window.location.origin}/maintenance/${request.maintenanceRequest.id}`
				}

				const response = await trpc.maintenance.sendNotification.mutateAsync(notificationData)

				// Log notification in database for tracking
				try {
					await trpc.maintenance.logNotification.mutateAsync({
						type: 'maintenance_notification',
						recipientEmail: request.recipient.email,
						recipientName: request.recipient.name,
						subject: getEmailSubject(request),
						maintenanceRequestId: request.maintenanceRequest.id,
						notificationType: request.type,
						status: 'sent'
					})
				} catch (logError) {
					console.warn('Failed to log notification', logError)
				}

				return response
			} catch (error) {
				console.error('Failed to send maintenance notification', error)
				throw error
			}
		},
		onSuccess: (data, variables) => {
			console.log('Maintenance notification sent successfully', {
				emailId: data.emailId,
				type: variables.type,
				maintenanceId: variables.maintenanceRequest.id
			})
		},
		onError: (error, variables) => {
			console.error('Failed to send maintenance notification', error, {
				type: variables.type,
				maintenanceId: variables.maintenanceRequest.id,
				recipientEmail: variables.recipient.email
			})

			// Show user-friendly error toast
			toast.error('Failed to send notification', {
				description:
					"The maintenance request was saved, but we couldn't send the email notification."
			})
		}
	})
}

// Helper function to create notification request from maintenance request
export function createMaintenanceNotification(
	maintenanceRequest: MaintenanceRequest & {
		unit: {
			unitNumber: string
			property: {
				name: string
				address: string
			}
		}
		tenant?: {
			name: string
			email: string
		}
	},
	recipient: { email: string; name: string; role: 'owner' | 'tenant' },
	type: 'new_request' | 'status_update' | 'emergency_alert' = 'new_request',
	actionUrl?: string
): MaintenanceNotificationRequest {
	return {
		type,
		maintenanceRequest: {
			id: maintenanceRequest.id,
			title: maintenanceRequest.title,
			description: maintenanceRequest.description || '',
			category: 'other',
			priority: maintenanceRequest.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY',
			status: maintenanceRequest.status as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED',
			createdAt: maintenanceRequest.createdAt,
			unit: maintenanceRequest.unit,
			tenant: maintenanceRequest.tenant
		},
		recipient,
		actionUrl
	}
}

// Helper function to generate email subject based on notification type
function getEmailSubject(request: MaintenanceNotificationRequest): string {
	const propertyName = request.maintenanceRequest.unit.property.name
	const unitNumber = request.maintenanceRequest.unit.unitNumber

	switch (request.type) {
		case 'emergency_alert':
			return `🚨 EMERGENCY: ${request.maintenanceRequest.title} - Unit ${unitNumber}, ${propertyName}`
		case 'new_request':
			return `New Maintenance Request: ${request.maintenanceRequest.title} - Unit ${unitNumber}`
		case 'status_update':
			return `Maintenance Update: ${request.maintenanceRequest.title} - ${request.maintenanceRequest.status}`
		default:
			return `Maintenance Notification - ${propertyName}`
	}
}

// Auto-determine notification type based on priority and status
export function getNotificationType(
	priority: MaintenanceRequest['priority'],
	isNewRequest = true
): 'new_request' | 'status_update' | 'emergency_alert' {
	if (priority === 'EMERGENCY') {
		return 'emergency_alert'
	}

	return isNewRequest ? 'new_request' : 'status_update'
}
