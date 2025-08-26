import { SetMetadata } from '@nestjs/common'
import type { UserRole } from '@repo/shared'

// Simple decorators for the auth requirements
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles)
export const AdminOnly = () => SetMetadata('admin-only', true)
<<<<<<< HEAD
export const Public = () => SetMetadata('is-public', true)
=======
export const Public = () => SetMetadata('is-public', true)
>>>>>>> origin/main
