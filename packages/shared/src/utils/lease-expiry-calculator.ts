/**
 * Lease Expiry Calculator Utility
 * 
 * Provides date calculation and notification formatting for lease expiry warnings.
 * Supports 30/60/90 day notification windows for property owner alerts.
 */

import type { DatabaseNotificationEventType } from '../types/notifications'

/**
 * Calculate days until lease expiry
 * @param expiryDateString ISO date string of lease expiry
 * @returns Number of days until expiry (can be negative if already expired)
 */
export function calculateDaysUntilExpiry(expiryDateString: string): number {
	const expiryDate = new Date(expiryDateString)
	const today = new Date()
	
	// Reset time to midnight for accurate day calculation
	today.setHours(0, 0, 0, 0)
	expiryDate.setHours(0, 0, 0, 0)
	
	const diffMs = expiryDate.getTime() - today.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
	
	return diffDays
}

type LeaseNotificationType = Extract<DatabaseNotificationEventType, 'lease_expiring_90_days' | 'lease_expiring_60_days' | 'lease_expiring_30_days'>

/**
 * Determine which notification types should be sent based on days until expiry
 * Notifications at 90, 60, and 30 days before expiry
 * 
 * @param daysUntilExpiry Days until lease expiry
 * @returns Array of notification types to create (e.g., ['lease_expiring_90_days'])
 */
export function calculateNotificationTypes(daysUntilExpiry: number): LeaseNotificationType[] {
	const types: LeaseNotificationType[] = []
	
	// 90-day warning (check window: 92-88 days)
	if (daysUntilExpiry >= 88 && daysUntilExpiry <= 92) {
		types.push('lease_expiring_90_days')
	}
	
	// 60-day warning (check window: 62-58 days)
	if (daysUntilExpiry >= 58 && daysUntilExpiry <= 62) {
		types.push('lease_expiring_60_days')
	}
	
	// 30-day warning (check window: 32-28 days)
	if (daysUntilExpiry >= 28 && daysUntilExpiry <= 32) {
		types.push('lease_expiring_30_days')
	}
	
	return types
}

/**
 * Format notification title based on notification type
 * @param notificationType Type of notification (e.g., 'lease_expiring_30_days')
 * @returns Formatted title string
 */
export function formatNotificationTitle(notificationType: string): string {
	switch (notificationType) {
		case 'lease_expiring_90_days':
			return 'Lease Expiring in 90 Days'
		case 'lease_expiring_60_days':
			return 'Lease Expiring in 60 Days'
		case 'lease_expiring_30_days':
			return 'Lease Expiring in 30 Days'
		default:
			return 'Lease Expiration Notice'
	}
}

/**
 * Format notification message with lease details
 * @param tenantName Name of the tenant
 * @param propertyName Name of the property
 * @param unitNumber Unit number
 * @param expirationDate ISO date string of lease expiry
 * @returns Formatted message string
 */
export function formatNotificationMessage(
	tenantName: string,
	propertyName: string,
	unitNumber: string,
	expirationDate: string
): string {
	const expiryDate = new Date(expirationDate)
	const formattedDate = expiryDate.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
	
	return `The lease for ${tenantName} at ${propertyName} (Unit ${unitNumber}) expires on ${formattedDate}. Please review and plan accordingly.`
}
