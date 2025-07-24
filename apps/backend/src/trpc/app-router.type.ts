/**
 * AppRouter Type Export
 * 
 * This file provides a clean type export for the AppRouter
 * without the factory function complexity.
 */

// Import the actual AppRouter type from the implementation
import type { createAppRouter } from './app-router'

// Export the type of the app router
export type AppRouter = ReturnType<typeof createAppRouter>