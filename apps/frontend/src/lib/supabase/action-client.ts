import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Minimal auth shape used by our server actions when Supabase is unavailable
type MinimalAuthResult<T> = { data?: T | null; error?: { message: string } | null }
interface MinimalSupabaseAuth {
  getUser(): Promise<MinimalAuthResult<{ user: unknown }>>
  getSession(): Promise<MinimalAuthResult<{ session: unknown }>>
  signInWithPassword(): Promise<MinimalAuthResult<unknown>>
  signUp(): Promise<MinimalAuthResult<unknown>>
  signOut(): Promise<{ error: null }>
  resetPasswordForEmail(): Promise<{ error: { message: string } }>
  updateUser(): Promise<MinimalAuthResult<unknown>>
}
type ResultShape = { data: null; error: { message: string } }

interface MinimalQueryBuilder {
  select(columns?: string): MinimalQueryBuilder
  insert(values: unknown): MinimalQueryBuilder
  update(values: unknown): MinimalQueryBuilder
  delete(): MinimalQueryBuilder
  eq(column: string, value: unknown): MinimalQueryBuilder
  neq(column: string, value: unknown): MinimalQueryBuilder
  gt(column: string, value: unknown): MinimalQueryBuilder
  gte(column: string, value: unknown): MinimalQueryBuilder
  lt(column: string, value: unknown): MinimalQueryBuilder
  lte(column: string, value: unknown): MinimalQueryBuilder
  like(column: string, pattern: string): MinimalQueryBuilder
  ilike(column: string, pattern: string): MinimalQueryBuilder
  is(column: string, value: unknown): MinimalQueryBuilder
  in(column: string, values: unknown[]): MinimalQueryBuilder
  contains(column: string, value: unknown): MinimalQueryBuilder
  containedBy(column: string, value: unknown): MinimalQueryBuilder
  order(column: string, options?: { ascending?: boolean }): MinimalQueryBuilder
  limit(count: number): MinimalQueryBuilder
  range(from: number, to: number): MinimalQueryBuilder
  single(): MinimalQueryBuilder
  // Promise-like interface compatible with `await`
  then<T = ResultShape>(onfulfilled?: (value: ResultShape) => T | PromiseLike<T>): Promise<T>
}

interface MinimalSupabaseClient { 
  auth: MinimalSupabaseAuth
  from(table: string): MinimalQueryBuilder
}

// Broad return type to avoid union inference issues in server actions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createActionClient(): Promise<any> {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Graceful fallback when Supabase is not configured (e.g., Preview or local static build)
  if (!url || !anon) {
    const client: MinimalSupabaseClient = {
      auth: {
        async getUser() {
          return { data: { user: null }, error: null }
        },
        async getSession() {
          return { data: { session: null }, error: null }
        },
        async signInWithPassword() {
          return {
            data: null,
            error: { message: 'Authentication is not configured in this environment.' }
          }
        },
        async signUp() {
          return {
            data: null,
            error: { message: 'Authentication is not configured in this environment.' }
          }
        },
        async signOut() {
          return { error: null }
        },
        async resetPasswordForEmail() {
          return {
            error: { message: 'Authentication is not configured in this environment.' }
          }
        },
        async updateUser() {
          return {
            data: null,
            error: { message: 'Authentication is not configured in this environment.' }
          }
        }
      },
      from() {
        const errorResult = { data: null, error: { message: 'Database is not configured in this environment.' } }
        const builder: MinimalQueryBuilder = {
          select: () => builder,
          insert: () => builder, 
          update: () => builder,
          delete: () => builder,
          eq: () => builder,
          neq: () => builder,
          gt: () => builder,
          gte: () => builder,
          lt: () => builder,
          lte: () => builder,
          like: () => builder,
          ilike: () => builder,
          is: () => builder,
          in: () => builder,
          contains: () => builder,
          containedBy: () => builder,
          order: () => builder,
          limit: () => builder,
          range: () => builder,
          single: () => builder,
          then: <T = ResultShape>(onfulfilled?: (value: ResultShape) => T | PromiseLike<T>): Promise<T> => {
            const result = Promise.resolve(errorResult as ResultShape)
            return (onfulfilled ? result.then(onfulfilled) : (result as unknown)) as Promise<T>
          }
        }
        return builder
      }
    }
    return client
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  })
}
