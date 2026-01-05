import type { MaintenancePriority } from './core.js'
// Notification types for TenantFlow application

type Priority = MaintenancePriority

// UI-only notification type constants (not stored in database)
export const NotificationType = {
	MAINTENANCE: 'maintenance',
	LEASE: 'LEASE',
	PAYMENT: 'PAYMENT',
	GENERAL: 'GENERAL',
	SYSTEM: 'SYSTEM',
	INFO: 'INFO' // Add INFO for compatibility
} as const

export type NotificationTypeValue =
	(typeof NotificationType)[keyof typeof NotificationType]

// API Request/Response types (consolidated from frontend)
export interface NotificationRequest {
	type: NotificationTypeValue
	title: string
	message: string
	recipientId?: string
	actionUrl?: string
	data?: Record<string, unknown>
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'URGENT'
}

export interface NotificationResponse {
	id: string
	sent: boolean
	sentAt: string
	// Frontend API response format
	success?: boolean
	data?: NotificationData
	error?: string
}

// Frontend notification data structure
export interface NotificationData {
	id: string
	title: string
	message: string
	priority: Priority
	type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
	read: boolean
	createdAt: Date
	updatedAt: Date
}

export interface CreateNotificationDto {
	title: string
	message: string
	priority?: Priority
	type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
}

export interface UpdateNotificationDto {
	read?: boolean
}

export interface MaintenanceNotificationData extends NotificationData {
	maintenanceRequestId?: string
	propertyId?: string
	unitId?: string
}

// Real-time notification types
export interface NotificationMessage {
	type: string
	data: Record<string, string | number | boolean | null>
	timestamp?: Date | string
	id?: string
}

// Base message type
export interface Message {
	type: string
	data: Record<string, unknown>
	timestamp?: string
	id?: string
}

export interface UseOptions {
	autoConnect?: boolean
	reconnectAttempts?: number
	reconnectDelay?: number
}

/**
 * Notification Channel Preferences
 * Controls HOW notifications are delivered (which channels)
 * Used for real-time notification system configuration
 */
export interface NotificationChannelPreferences {
	email: boolean
	push: boolean
	sms: boolean
	inApp: boolean
	categories: {
		maintenance: boolean
		leases: boolean
		general: boolean
	}
}

export type NotificationChannelPreferencesWithVersion =
	NotificationChannelPreferences & {
		version?: number
	}

/**
 * @deprecated Use NotificationChannelPreferences instead
 * Kept for backwards compatibility during migration
 */
export type NotificationPreferences = NotificationChannelPreferences

/**
 * @deprecated Use NotificationChannelPreferencesWithVersion instead
 */
export type NotificationPreferencesWithVersion =
	NotificationChannelPreferencesWithVersion

// Notification priority constants
export const NOTIFICATION_PRIORITY = {
	LOW: 'LOW',
	MEDIUM: 'MEDIUM',
	HIGH: 'HIGH',
	URGENT: 'URGENT'
} as const

export type NotificationPriorityValue =
	(typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY]

export const NOTIFICATION_PRIORITY_OPTIONS = [
	{ value: 'LOW', label: 'Low' },
	{ value: 'MEDIUM', label: 'Medium' },
	{ value: 'HIGH', label: 'High' },
	{ value: 'URGENT', label: 'Urgent' }
] as const

// Push notification types
export interface PushNotification {
	title: string
	body: string
	icon?: string
	badge?: string
	tag?: string
	data?: Record<string, string | number | boolean | null>
}

// Database event notification types (stored in database)
export type DatabaseNotificationEventType =
	// Lease notifications
	| 'lease_expiring_90_days'
	| 'lease_expiring_60_days'
	| 'lease_expiring_30_days'
	// Billing/Subscription notifications
	| 'subscription_created'
	| 'subscription_updated'
	| 'subscription_cancelled'
	| 'payment_succeeded'
	| 'payment_failed'
	| 'trial_ending'
	| 'subscription_renewed'

// BACKEND NOTIFICATION CONTROLLER TYPES - CONSOLIDATED from backend

export interface GetNotificationOptions {
	unreadOnly?: boolean
	limit?: number
	offset?: number
}

export interface CreateNotificationRequest {
	recipientId: string
	title: string
	message: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	actionUrl?: string
	data?: Record<string, unknown>
}

export interface MaintenanceNotificationRequest {
	recipientId: string
	title: string
	message: string
	type: NotificationTypeValue
	unitId: string
	priority: Priority
}
