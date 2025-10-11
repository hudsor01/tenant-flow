/**
 * Context Helper Hooks
 * Type-safe utilities for working with React Context in React 19
 *
 * NO ABSTRACTIONS - Direct React Context API usage only
 */

import { use, useContext, type Context } from 'react'

/**
 * Type-safe context hook creator
 * Creates a hook that throws if used outside provider
 *
 * Usage:
 * ```tsx
 * const MyContext = createContext<MyValue | null>(null)
 * const useMyContext = createContextHook(MyContext, 'MyContext')
 *
 * // In component
 * const value = useMyContext() // Throws if outside provider
 * ```
 */
export function createContextHook<T>(
	context: Context<T | null>,
	contextName: string
) {
	return function useCreatedContext(): T {
		// React 19 pattern: use() hook for context
		const value = use(context)
		if (value === null) {
			throw new Error(`${contextName} must be used within its Provider`)
		}
		return value
	}
}

/**
 * Type-safe optional context hook creator
 * Creates a hook that returns undefined if used outside provider
 *
 * Usage:
 * ```tsx
 * const MyContext = createContext<MyValue | null>(null)
 * const useMyContext = createOptionalContextHook(MyContext)
 *
 * // In component
 * const value = useMyContext() // Returns undefined if outside provider
 * if (value) {
 *   // Use value
 * }
 * ```
 */
export function createOptionalContextHook<T>(context: Context<T | null>) {
	return function useCreatedOptionalContext(): T | undefined {
		const value = use(context)
		return value ?? undefined
	}
}

/**
 * Hook to check if inside a specific context
 * Useful for conditional rendering or logic
 *
 * Usage:
 * ```tsx
 * const TenantContext = createContext<TenantValue | null>(null)
 *
 * function Component() {
 *   const isInTenantContext = useIsInContext(TenantContext)
 *   if (!isInTenantContext) {
 *     return <Link to="select-tenant">Select a tenant first</Link>
 *   }
 *   // Render tenant-specific content
 * }
 * ```
 */
export function useIsInContext<T>(context: Context<T | null>): boolean {
	const value = use(context)
	return value !== null
}

/**
 * Hook to safely access context with fallback
 * Returns fallback value if outside provider
 *
 * Usage:
 * ```tsx
 * const TenantContext = createContext<TenantValue | null>(null)
 *
 * function Component() {
 *   const tenant = useContextWithFallback(TenantContext, defaultTenant)
 *   return <div>{tenant.name}</div>
 * }
 * ```
 */
export function useContextWithFallback<T>(
	context: Context<T | null>,
	fallback: T
): T {
	const value = use(context)
	return value ?? fallback
}

/**
 * React 18 compatible context hook
 * Use this for backwards compatibility if needed
 *
 * Note: Prefer use() from React 19 when possible
 */
export function createLegacyContextHook<T>(
	context: Context<T | null>,
	contextName: string
) {
	return function useCreatedLegacyContext(): T {
		const value = useContext(context)
		if (value === null) {
			throw new Error(`${contextName} must be used within its Provider`)
		}
		return value
	}
}
