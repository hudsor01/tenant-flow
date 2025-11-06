import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Notification Preferences Schema
 * Defines which notification channels and types a tenant wants to receive
 */
export const NotificationPreferencesSchema = z.object({
	rentReminders: z.boolean().describe('Receive reminders before rent is due'),
	maintenanceUpdates: z
		.boolean()
		.describe('Receive updates on maintenance requests'),
	propertyNotices: z
		.boolean()
		.describe('Receive important property announcements'),
	emailNotifications: z
		.boolean()
		.describe('Receive notifications via email'),
	smsNotifications: z.boolean().describe('Receive notifications via SMS')
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
 * Type export for TypeScript usage
 */
export type NotificationPreferences = z.infer<
	typeof NotificationPreferencesSchema
>
export type UpdateNotificationPreferences = z.infer<
	typeof UpdateNotificationPreferencesSchema
>
