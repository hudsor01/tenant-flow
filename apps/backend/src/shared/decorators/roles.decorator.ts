import { SetMetadata } from '@nestjs/common'
import type { UserRole } from '@repo/shared/types/auth'

/**
 * Set required roles for a route
 * RolesGuard checks if user's JWT claim matches
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles)
