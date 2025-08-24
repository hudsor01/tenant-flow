import { z } from 'zod'

export const UpdateUserProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  company: z.string().optional(),
  avatarUrl: z.string().optional()
})

export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>
