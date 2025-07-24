/**
 * Router Definition with Proper Type Inference
 * 
 * This file creates the router structure in a way that TRPC v11
 * can properly infer types without collision errors.
 */

import { createRouter } from './trpc'
import type { AnyRouter } from '@trpc/server'

// Define a type-safe router structure
export const createRouterStructure = <T extends Record<string, AnyRouter>>(routers: T) => {
  return createRouter(routers)
}

// Export the type helper
export type InferRouterType<T extends Record<string, AnyRouter>> = ReturnType<typeof createRouterStructure<T>>