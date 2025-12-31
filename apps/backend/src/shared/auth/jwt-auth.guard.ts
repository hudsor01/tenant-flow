/**
 * JWT Auth Guard - Supabase Authentication
 *
 * Simple guard that delegates to SupabaseService.getUser()
 * Supabase SDK handles all JWT verification, key rotation, and token validation
 */

import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { User } from '@supabase/supabase-js'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly supabaseService: SupabaseService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if route is marked as public
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass()
		])

		if (isPublic) {
			return true
		}

		const request = context
			.switchToHttp()
			.getRequest<Request & { user?: User }>()

		// Use SupabaseService.getUser() - it handles:
		// - Token extraction from Authorization header
		// - JWT verification via Supabase SDK
		// - Request-level caching
		const user = await this.supabaseService.getUser(request)

		if (!user) {
			throw new UnauthorizedException('Authentication required')
		}

		// Attach user to request for downstream use
		request.user = user

		return true
	}
}
