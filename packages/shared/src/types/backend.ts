// User types used in authentication
export interface ValidatedUser {
  id: string
  email: string
  name?: string
  phone: string | null
  bio: string | null
  avatarUrl?: string
  role: string
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  supabaseId: string
  stripeCustomerId: string | null
}

// Base Context type for API requests
export interface Context {
  req: Request
  res: Response
  user?: ValidatedUser
}

// Authenticated context type
export type AuthenticatedContext = Context & { user: ValidatedUser }