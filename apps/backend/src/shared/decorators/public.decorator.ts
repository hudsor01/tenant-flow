/**
 * Public Route Decorator
 *
 * Marks a route as publicly accessible, bypassing JWT authentication
 * Used with JwtAuthGuard to exclude specific endpoints from auth checks
 */

import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
