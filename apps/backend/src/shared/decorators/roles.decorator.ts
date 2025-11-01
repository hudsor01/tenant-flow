import { SetMetadata } from '@nestjs/common'
import type { UserRole } from '@repo/shared/types/auth'

/**
 * Decorator to specify which user roles are allowed to access a route
 * Works with RolesGuard to enforce role-based access control
 *
 * @example
 * @Roles('OWNER', 'MANAGER')
 * @Get('properties')
 * async getProperties() { ... }
 *
 * @example
 * @Roles('TENANT')
 * @Get('my-lease')
 * async getMyLease() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles)
