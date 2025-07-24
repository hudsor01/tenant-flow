#!/usr/bin/env tsx

/**
 * Simple TRPC Type Generation
 * 
 * This script delegates to the main sync-trpc-types.ts script
 * which creates proper type definitions without using 'any'.
 */

import { syncTrpcTypes } from './sync-trpc-types'

// Run the main type sync script
syncTrpcTypes().catch(error => {
  console.error('❌ Error generating TRPC types:', error)
  process.exit(1)
})