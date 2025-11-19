import { SetMetadata } from '@nestjs/common'
import type { UserRole } from '@repo/shared/types/auth'

/**
 * Decorator to specify which user user_types are allowed to access a route
 * Works with user_typesGuard to enforce user_type-based access control
 *
 * @example
 * @user_types('PROPERTY_OWNER', 'PROPERTY_MANAGER')
 * @Get('properties')
 * async getProperties() { ... }
 *
 * @example
 * @user_types('TENANT')
 * @Get('my-lease')
 * async getMyLease() { ... }
 */
export const user_types = (...user_types: UserRole[]) => SetMetadata('user_types', user_types)
