/**
 * Backend-specific types (consolidated from apps/backend/src/trpc/types)
 * These are the TRPC handler types and context types used by the backend
 */

// TRPC Context Types (from apps/backend/src/trpc/types/common.ts)
export interface ValidatedUser {
  id: string
  email: string
  name?: string  // string | undefined for TRPC compatibility
  phone: string | null
  bio: string | null
  avatarUrl?: string  // string | undefined for TRPC compatibility
  role: string
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  supabaseId: string
  stripeCustomerId: string | null
}

// Base Context type (simplified from backend)
export interface Context {
  req: any
  res: any
  user?: ValidatedUser
}

// Authenticated context type
export type AuthenticatedContext = Context & { user: ValidatedUser }

// Base query/mutation handler types
export type QueryHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined
  ? (opts: { ctx: AuthenticatedContext }) => Promise<TOutput>
  : (opts: { input: TInput; ctx: AuthenticatedContext }) => Promise<TOutput>

export type MutationHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined
  ? (opts: { ctx: AuthenticatedContext }) => Promise<TOutput>
  : (opts: { input: TInput; ctx: AuthenticatedContext }) => Promise<TOutput>

// Public procedure handler types (without user)
export type PublicQueryHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined
  ? (opts: { ctx: Context }) => Promise<TOutput>
  : (opts: { input: TInput; ctx: Context }) => Promise<TOutput>

export type PublicMutationHandler<TInput = undefined, TOutput = unknown> = TInput extends undefined
  ? (opts: { ctx: Context }) => Promise<TOutput>
  : (opts: { input: TInput; ctx: Context }) => Promise<TOutput>