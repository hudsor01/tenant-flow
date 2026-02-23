/**
 * Admin Validation Schemas
 *
 * Schemas for admin-only operations on users.
 * These schemas enforce valid enum values for privileged mutations.
 */

import { z } from 'zod'
import { userTypeSchema, userStatusSchema } from './users.js'

/**
 * Schema for admin updating a user's role and/or status.
 * Both fields are optional so partial updates are supported.
 */
export const adminUpdateUserSchema = z.object({
	role: userTypeSchema.optional(),
	status: userStatusSchema.optional()
})

export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>
