import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Notification Preferences Schema
 * Matches the notification_settings database table structure
 *
 * Channels: email, sms, push, in_app
 * Categories: general, maintenance, leases
 */
export const NotificationPreferencesSchema = z.object({
	// Channels
	email: z.boolean().describe('Receive notifications via email'),
	sms: z.boolean().describe('Receive notifications via SMS'),
	push: z.boolean().describe('Receive push notifications'),
	in_app: z.boolean().describe('Receive in-app notifications'),
	// Categories
	general: z.boolean().describe('Receive general announcements'),
	maintenance: z.boolean().describe('Receive maintenance updates'),
	leases: z.boolean().describe('Receive lease-related notifications'),
})

/**
 * Update Notification Preferences DTO
 * Allows partial updates - only specified fields will be updated
 */
export const UpdateNotificationPreferencesSchema =
	NotificationPreferencesSchema.partial()

export class UpdateNotificationPreferencesDto extends createZodDto(
	UpdateNotificationPreferencesSchema
) {}

/**
 * Notification Preferences Response DTO
 */
export class NotificationPreferencesDto extends createZodDto(
	NotificationPreferencesSchema
) {}

/**
 * Type exports
 */
export type NotificationPreferences = z.infer<
	typeof NotificationPreferencesSchema
>
export type UpdateNotificationPreferences = z.infer<
	typeof UpdateNotificationPreferencesSchema
>
