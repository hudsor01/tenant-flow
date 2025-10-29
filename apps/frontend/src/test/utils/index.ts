/**
 * Test Utilities - Central Export
 * Single import point for test utilities following ULTRA-NATIVE principles
 *
 * NO FACTORIES, NO BUILDERS - Only native platform features and provider setup
 *
 * @example
 * import { render, screen, DEFAULT_TENANT, createMockQuery } from '#test/utils'
 */

// Re-export render utilities (allowed - reduces React Query boilerplate)
export * from './test-render'

// Re-export test data (native object literals)
export * from './test-data'

// Re-export mocks (allowed - simplifies TanStack Query mocking)
export * from './test-mocks'
