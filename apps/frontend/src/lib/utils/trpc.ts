/**
 * TRPC React Query Integration
 * 
 * This file sets up the TRPC React hooks following the official v11 documentation.
 */

import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@tenantflow/shared'

// Create the React hooks with the proper router type
export const trpc = createTRPCReact<AppRouter>()

// Export type helpers for use in components
export type TRPCReactType = typeof trpc