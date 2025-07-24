#!/usr/bin/env tsx

/**
 * Generate Shared TRPC Types
 * 
 * This script delegates to the main sync-trpc-types.ts script
 * which properly handles TRPC type generation with full type safety.
 */

import { syncTrpcTypes } from './sync-trpc-types'

// Run the main type sync script
syncTrpcTypes().catch(error => {
  console.error('❌ Error generating shared TRPC types:', error)
  process.exit(1)
})