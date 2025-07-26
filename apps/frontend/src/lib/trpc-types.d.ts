// TRPC Type Assertions
// This file provides type assertions for TRPC client to fix TypeScript inference issues

import type { AppRouter } from '@tenantflow/shared'
import type { createTRPCClient } from '@trpc/client'

// Create a properly typed TRPC client type
export type TypedTRPCClient = ReturnType<typeof createTRPCClient<AppRouter>>

// Helper to assert TRPC client type
export function assertTRPCClient(client: unknown): asserts client is TypedTRPCClient {
  // Type assertion only, no runtime check needed
}