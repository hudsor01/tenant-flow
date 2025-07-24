/**
 * TRPC Router Type Definition
 * 
 * This file provides the AppRouter type for frontend consumption.
 * We import from the actual app-router.ts file to get the real type.
 */

// Import the actual AppRouter type from app-router.ts
import type { AppRouter } from './app-router'

// Re-export it
export type { AppRouter }