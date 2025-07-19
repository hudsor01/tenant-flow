/**
 * Common TRPC types and utilities
 * Centralizes type definitions to avoid 'any' usage across routers
 */

import type { Context } from '../context/app.context'
import type { ValidatedUser } from '../../auth/auth.service'

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