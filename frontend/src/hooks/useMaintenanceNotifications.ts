import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
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
			logger.apiCall('POST', '/maintenance/notifications', {
				type: request.type,
				maintenanceId: request.maintenanceRequest.id,
				recipientRole: request.recipient.role
			})

			try {
				// Send maintenance notification via Supabase Edge Function
				const emailData = {
					to: request.recipient.email,
					subject: getEmailSubject(request),
					template: 'maintenance-notification',
					data: {
						recipientName: request.recipient.name,
						notificationType: request.type,
						maintenanceRequest: request.maintenanceRequest,
						actionUrl:
							request.actionUrl ||
							`${window.location.origin}/maintenance/${request.maintenanceRequest.id}`,
						propertyName:
							request.maintenanceRequest.unit.property.name,
						unitNumber: request.maintenanceRequest.unit.unitNumber,
						priority: request.maintenanceRequest.priority,
						status: request.maintenanceRequest.status,
						isEmergency: request.type === 'emergency_alert'
					}
				}

				const { data, error } = await supabase.functions.invoke(
					'send-maintenance-notification',
					{
						body: emailData
					}
				)

				if (error) throw error

				// Log notification in database for tracking
				const { error: logError } = await supabase
					.from('notification_log')
					.insert({
						type: 'maintenance_notification',
						recipient_email: request.recipient.email,
						recipient_name: request.recipient.name,
						subject: emailData.subject,
						maintenance_request_id: request.maintenanceRequest.id,
						notification_type: request.type,
						sent_at: new Date().toISOString(),
						status: 'sent'
					})

				if (logError) {
					logger.warn('Failed to log notification', logError)
				}

				return {
					emailId: data?.id || `email-${Date.now()}`,
					sentAt: new Date().toISOString(),
					type: request.type
				}
			} catch (error) {
				logger.error('Failed to send maintenance notification', error)
				throw error
			}
		},
		onSuccess: (data, variables) => {
			logger.debug('Maintenance notification sent successfully', {
				emailId: data.emailId,
				type: variables.type,
				maintenanceId: variables.maintenanceRequest.id
			})
		},
		onError: (error, variables) => {
			logger.error(
				'Failed to send maintenance notification',
				error as Error,
				{
					type: variables.type,
					maintenanceId: variables.maintenanceRequest.id,
					recipientEmail: variables.recipient.email
				}
			)

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
			description: maintenanceRequest.description,
			category: maintenanceRequest.category || 'other',
			priority: maintenanceRequest.priority,
			status: maintenanceRequest.status,
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
