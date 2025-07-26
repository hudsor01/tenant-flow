/**
 * TRPC React Query Integration
 * 
 * This file sets up the TRPC React hooks following the official v11 documentation.
 * Official naming convention: utils/trpc.ts (not trpc-react.ts)
 */

import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@tenantflow/backend/trpc'

// Create the React hooks
// This is the official way to create TRPC React integration
// Type assertion applied after creation to work around lazy router compatibility
export const trpc = createTRPCReact<AppRouter>()

// Export type helpers for use in components
export type TRPCReactType = typeof trpc