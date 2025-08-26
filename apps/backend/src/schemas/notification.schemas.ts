/**
 * Notification Schemas
<<<<<<< HEAD
 *
=======
 * 
>>>>>>> origin/main
 * JSON Schema definitions for notification endpoints.
 * Replaces class-validator DTOs with type-safe schema definitions.
 */

<<<<<<< HEAD
import type { JSONSchema } from '../shared/types/fastify-type-provider'

// Priority enum schema
const prioritySchema: JSONSchema = {
=======
import { 
	createTypedSchema, 
	schemaRegistry, 
	type TypedJSONSchema 
} from '../shared/types/fastify-type-provider'

// Priority enum schema
const prioritySchema: TypedJSONSchema = {
>>>>>>> origin/main
	type: 'string',
	enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'],
	description: 'Notification priority level'
}

// Notification type schema
<<<<<<< HEAD
const notificationTypeSchema: JSONSchema = {
=======
const notificationTypeSchema: TypedJSONSchema = {
>>>>>>> origin/main
	type: 'string',
	enum: [
		'maintenance_request_created',
		'maintenance_request_created_emergency',
		'maintenance_request_created_high',
		'maintenance_request_created_medium',
		'maintenance_request_created_low',
		'maintenance_update',
		'maintenance_update_emergency',
		'maintenance_update_high',
		'maintenance_update_medium',
		'maintenance_update_low',
		'lease_expiring',
		'payment_received',
		'payment_overdue',
		'tenant_added',
		'property_added'
	],
	description: 'Type of notification'
}

/**
 * Create notification request
 */
export interface CreateNotificationRequest {
	recipientId: string
	title: string
	message: string
	type: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	actionUrl?: string
	data?: Record<string, unknown>
}

<<<<<<< HEAD
export const createNotificationSchema: JSONSchema = {
=======
export const createNotificationSchema = createTypedSchema<CreateNotificationRequest>({
>>>>>>> origin/main
	type: 'object',
	required: ['recipientId', 'title', 'message', 'type', 'priority'],
	additionalProperties: false,
	properties: {
		recipientId: {
			type: 'string',
			format: 'uuid',
			description: 'ID of the user who will receive the notification'
		},
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 200,
			description: 'Notification title'
		},
		message: {
			type: 'string',
			minLength: 1,
			maxLength: 1000,
			description: 'Notification message content'
		},
		type: notificationTypeSchema,
		priority: prioritySchema,
		actionUrl: {
			type: 'string',
			format: 'uri',
			description: 'Optional URL for notification action'
		},
		data: {
			type: 'object',
			description: 'Additional notification metadata',
			additionalProperties: true
		}
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Mark notification as read request
 */
export interface MarkAsReadRequest {
	notificationId: string
}

<<<<<<< HEAD
export const markAsReadSchema: JSONSchema = {
=======
export const markAsReadSchema = createTypedSchema<MarkAsReadRequest>({
>>>>>>> origin/main
	type: 'object',
	required: ['notificationId'],
	additionalProperties: false,
	properties: {
		notificationId: {
			type: 'string',
			format: 'uuid',
			description: 'ID of the notification to mark as read'
		}
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Get notifications query parameters
 */
export interface GetNotificationsQuery {
	unreadOnly?: boolean
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	limit?: number
	offset?: number
	type?: string
}

<<<<<<< HEAD
export const getNotificationsQuerySchema: JSONSchema = {
=======
export const getNotificationsQuerySchema = createTypedSchema<GetNotificationsQuery>({
>>>>>>> origin/main
	type: 'object',
	additionalProperties: false,
	properties: {
		unreadOnly: {
			type: 'boolean',
			default: false,
			description: 'Filter to only unread notifications'
		},
		priority: prioritySchema,
		limit: {
			type: 'integer',
			minimum: 1,
			maximum: 100,
			default: 20,
			description: 'Number of notifications to return'
		},
		offset: {
			type: 'integer',
			minimum: 0,
			default: 0,
			description: 'Number of notifications to skip'
		},
		type: notificationTypeSchema
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Notification response
 */
export interface NotificationResponse {
	id: string
	recipientId: string
	title: string
	message: string
	type: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
	read: boolean
	actionUrl?: string
	data?: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

<<<<<<< HEAD
export const notificationResponseSchema: JSONSchema = {
	type: 'object',
	required: [
		'id',
		'recipientId',
		'title',
		'message',
		'type',
		'priority',
		'read',
		'createdAt',
		'updatedAt'
	],
=======
export const notificationResponseSchema = createTypedSchema<NotificationResponse>({
	type: 'object',
	required: ['id', 'recipientId', 'title', 'message', 'type', 'priority', 'read', 'createdAt', 'updatedAt'],
>>>>>>> origin/main
	properties: {
		id: {
			type: 'string',
			format: 'uuid',
			description: 'Notification unique identifier'
		},
		recipientId: {
			type: 'string',
			format: 'uuid',
			description: 'ID of the notification recipient'
		},
		title: {
			type: 'string',
			description: 'Notification title'
		},
		message: {
			type: 'string',
			description: 'Notification message content'
		},
		type: notificationTypeSchema,
		priority: prioritySchema,
		read: {
			type: 'boolean',
			description: 'Whether the notification has been read'
		},
		actionUrl: {
			type: 'string',
			format: 'uri',
			description: 'Optional URL for notification action'
		},
		data: {
			type: 'object',
			description: 'Additional notification metadata',
			additionalProperties: true
		},
		createdAt: {
			type: 'string',
			format: 'date-time',
			description: 'When the notification was created'
		},
		updatedAt: {
			type: 'string',
			format: 'date-time',
			description: 'When the notification was last updated'
		}
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Notifications list response
 */
export interface NotificationsListResponse {
	notifications: NotificationResponse[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
	unreadCount: number
}

<<<<<<< HEAD
export const notificationsListResponseSchema: JSONSchema = {
=======
export const notificationsListResponseSchema = createTypedSchema<NotificationsListResponse>({
>>>>>>> origin/main
	type: 'object',
	required: ['notifications', 'pagination', 'unreadCount'],
	properties: {
		notifications: {
			type: 'array',
			items: notificationResponseSchema
		},
		pagination: {
			type: 'object',
			required: ['total', 'limit', 'offset', 'hasMore'],
			properties: {
				total: {
					type: 'integer',
					minimum: 0,
					description: 'Total number of notifications'
				},
				limit: {
					type: 'integer',
					minimum: 1,
					description: 'Number of notifications returned'
				},
				offset: {
					type: 'integer',
					minimum: 0,
					description: 'Number of notifications skipped'
				},
				hasMore: {
					type: 'boolean',
					description: 'Whether there are more notifications'
				}
			}
		},
		unreadCount: {
			type: 'integer',
			minimum: 0,
			description: 'Total number of unread notifications'
		}
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Maintenance notification specific data schema
 */
export interface MaintenanceNotificationData {
	propertyName: string
	unitNumber: string
	description: string
	requestTitle: string
}

<<<<<<< HEAD
export const maintenanceNotificationDataSchema: JSONSchema = {
=======
export const maintenanceNotificationDataSchema = createTypedSchema<MaintenanceNotificationData>({
>>>>>>> origin/main
	type: 'object',
	required: ['propertyName', 'unitNumber', 'description', 'requestTitle'],
	properties: {
		propertyName: {
			type: 'string',
			description: 'Name of the property'
		},
		unitNumber: {
			type: 'string',
			description: 'Unit number or identifier'
		},
		description: {
			type: 'string',
			description: 'Maintenance request description'
		},
		requestTitle: {
			type: 'string',
			description: 'Title of the maintenance request'
		}
	}
<<<<<<< HEAD
}

// Schemas are exported directly for use in NestJS controllers
// No custom registry needed - use Fastify's native addSchema() if sharing is required
=======
})

// Register schemas
schemaRegistry.register('create-notification', createNotificationSchema)
schemaRegistry.register('mark-as-read', markAsReadSchema)
schemaRegistry.register('get-notifications-query', getNotificationsQuerySchema)
schemaRegistry.register('notification-response', notificationResponseSchema)
schemaRegistry.register('notifications-list-response', notificationsListResponseSchema)
schemaRegistry.register('maintenance-notification-data', maintenanceNotificationDataSchema)
>>>>>>> origin/main

// Export route schemas for controller usage
export const notificationRouteSchemas = {
	createNotification: {
		body: createNotificationSchema,
		response: {
			201: notificationResponseSchema,
			400: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	getNotifications: {
		querystring: getNotificationsQuerySchema,
		response: {
			200: notificationsListResponseSchema
		}
	},
	markAsRead: {
		body: markAsReadSchema,
		response: {
			200: {
				type: 'object',
				properties: {
					success: { type: 'boolean' },
					message: { type: 'string' }
				}
			}
		}
	}
<<<<<<< HEAD
} as const
=======
} as const
>>>>>>> origin/main
