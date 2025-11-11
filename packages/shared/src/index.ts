/**
 * TenantFlow Shared Package - Empty Barrel Export
 *
 * This file is REQUIRED for TypeScript project references and monorepo build system.
 * However, it intentionally exports nothing to avoid type conflicts.
 *
 * **All imports must use direct paths:**
 *
 * Types:
 *   import type { User, Property } from '@repo/shared/types/core'
 *   import type { authUser } from '@repo/shared/types/auth'
 *
 * Constants:
 *   import { AUTH_ERROR_MESSAGES } from '@repo/shared/constants/auth'
 *
 * Utilities:
 *   import { formatCurrency } from '@repo/shared/utils/currency'
 *
 * Validation:
 *   import { propertySchema } from '@repo/shared/validation/properties'
 *
 * **CANONICAL TYPE LOCATIONS (post-refactor):**
 *
 * Infrastructure/Utility Types:
 *   import type { Pagination, DashboardMetricsResponse, PropertyPerformanceResponse } from '@repo/shared/types/core'
 *
 * API Contract Types (Domain-specific):
 *   import type { CreatePropertyRequest, PropertyResponse } from '@repo/shared/types/api-contracts'
 *   import type { CreateSubscriptionRequest, SubscriptionResponse } from '@repo/shared/types/api-contracts'
 *
 * Form State Types:
 *   import type { FormState } from '@repo/shared/types/api'
 *
 * The package.json exports field resolves these paths correctly.
 * This approach eliminates duplicate export conflicts while maintaining
 * full type safety and module resolution.
 */

// Empty export to make this a valid ES module
export {}
