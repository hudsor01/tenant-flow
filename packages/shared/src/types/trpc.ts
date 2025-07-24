// TRPC-related types for shared use

/**
 * Re-export the properly typed AppRouter from the generated file
 * This maintains type safety while avoiding circular dependencies
 */
export type { AppRouter, RouterInputs, RouterOutputs } from '../trpc.generated'