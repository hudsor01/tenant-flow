// Centralized User interface for workspace-wide usage
// This is kept for backward compatibility but use the User interface from auth.ts
import type { UserRole } from './auth'

export interface User {
  id: string
  supabaseId: string
  stripeCustomerId: string | null
  email: string
  name: string | null
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  role: UserRole
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
}
