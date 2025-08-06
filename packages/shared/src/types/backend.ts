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

// Fastify Request Context for tracking request lifecycle
export interface RequestContext {
  requestId: string
  tenantId?: string
  userId?: string
  startTime: number
  path: string
  method: string
  ip: string
}

// Performance metrics for monitoring
export interface PerformanceMetrics {
  tenantId: string
  avgResponseTime: number
  errorCount: number
  requestCount: number
  lastUpdated: number
}