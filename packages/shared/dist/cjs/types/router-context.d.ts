/**
 * Router Context Types for TanStack Router
 *
 * Simple, typed context for route loaders with minimal overhead
 */
import type { QueryClient } from '@tanstack/react-query';
/**
 * Standard router context provided to all route loaders
 * This matches the context configured in router-instance.tsx
 */
export interface RouterContext {
    queryClient: QueryClient;
    api: Record<string, unknown>;
}
/**
 * Enhanced router context with additional utilities
 * Currently identical to RouterContext, but available for future extensions
 */
export type EnhancedRouterContext = RouterContext;
/**
 * User context for authentication state
 */
export interface UserContext {
    user: {
        id: string;
        email: string;
        name?: string;
        role?: string;
    } | null;
    isAuthenticated: boolean;
}
/**
 * Permission types for authorization
 */
export type Permission = string;
/**
 * Loader error interface
 */
export interface LoaderError extends Error {
    statusCode?: number;
    code?: string;
    type?: string;
    retryable?: boolean;
    metadata?: Record<string, unknown>;
}
/**
 * Enhanced error interface
 */
export interface EnhancedError extends Error {
    statusCode?: number;
    code?: string;
    type?: string;
    retryable?: boolean;
}
/**
 * Type for route loader parameters
 */
export interface LoaderParams {
    context: RouterContext;
    params: Record<string, string>;
    location: {
        search: Record<string, unknown>;
        pathname: string;
    };
}
/**
 * Generic loader function type
 */
export type LoaderFunction<TData = unknown> = (params: LoaderParams) => Promise<TData>;
//# sourceMappingURL=router-context.d.ts.map