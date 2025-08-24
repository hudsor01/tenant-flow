import { z } from 'zod'

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  // Ensure fields match shared types: string | null (not undefined)
  phone: z.union([z.string(), z.null()]),
  emergencyContact: z.union([z.string(), z.null()]),
  userId: z.union([z.string(), z.null()]),
  invitationStatus: z.string(),
  // Transform ISO timestamps to Date
  createdAt: z.string().transform(s => new Date(s)),
  updatedAt: z.string().transform(s => new Date(s))
})

export const TenantArraySchema = z.array(TenantSchema)

export const CreateTenantInputSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional()
})

export const UpdateTenantInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional()
})

export const TenantStatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  newThisMonth: z.number()
})

export type Tenant = z.infer<typeof TenantSchema>
export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantInputSchema>
