// Notification types for TenantFlow application
import type { Priority } from './maintenance'

// Notification type enum
export enum NotificationType {
	MAINTENANCE = 'MAINTENANCE',
	LEASE = 'LEASE',
	PAYMENT = 'PAYMENT',
	GENERAL = 'GENERAL',
	SYSTEM = 'SYSTEM',
	INFO = 'INFO' // Add INFO for compatibility
}

// API Request/Response types (consolidated from frontend)
export interface NotificationRequest {
	type: NotificationType
	title: string
	message: string
	recipientId?: string
	actionUrl?: string
	data?: Record<string, unknown>
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
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

// WebSocket types for real-time notifications
export interface NotificationWebSocketMessage {
	type: string
	data: Record<string, string | number | boolean | null>
	timestamp?: Date | string
	id?: string
}

// Base WebSocket message type
export interface WebSocketMessage {
	type: string
	data: Record<string, unknown>
	timestamp?: string
	id?: string
}

export interface WebSocketState {
	isConnected: boolean
	lastMessage: WebSocketMessage | null
	error: string | null
	reconnectCount: number
}

export interface UseWebSocketOptions {
	autoConnect?: boolean
	reconnectAttempts?: number
	reconnectDelay?: number
}

// Notification preferences
export interface NotificationPreferences {
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

// Notification priority enum
export enum NotificationPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

export const NOTIFICATION_PRIORITY = {
	LOW: 'LOW',
	MEDIUM: 'MEDIUM',
	HIGH: 'HIGH',
	URGENT: 'URGENT'
} as const

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

// =============================================================================
// BACKEND NOTIFICATION CONTROLLER TYPES - CONSOLIDATED from backend
// =============================================================================

export interface GetNotificationOptions {
	unreadOnly?: boolean
	limit?: number
	offset?: number
}

export interface CreateNotificationRequest {
recipientId: string
title: string
message: string
priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
actionUrl?: string
data?: Record<string, unknown>
}

export interface MaintenanceNotificationRequest {
recipientId: string
title: string
message: string
type: NotificationType
unitId: string
priority: Priority
}
