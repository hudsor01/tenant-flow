/**
 * Current User Provider - Request-Scoped User Injection
 *
 * Native NestJS pattern using REQUEST scope to provide authenticated user
 * per request. Eliminates duplicate getUser() calls across controllers.
 *
 * CLAUDE.md Compliant:
 * - Uses official @nestjs/common Scope.REQUEST (not custom abstraction)
 * - Caches user lookup per request (performance optimization)
 * - Throws standard UnauthorizedException (built-in)
 */

import {
	Inject,
	Injectable,
	Scope,
	UnauthorizedException
} from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { authUser } from '@repo/shared/types/auth'
import type { Request } from 'express'
import { SupabaseService } from '../../database/supabase.service'

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserProvider {
	private cachedUser: authUser | null = null
	private userLoaded = false

	constructor(
		@Inject(REQUEST) private readonly request: Request,
		private readonly supabaseService: SupabaseService
	) {}

	/**
	 * Get authenticated user (cached per request)
	 * @throws UnauthorizedException if user is not authenticated
	 */
	async getUser(): Promise<authUser> {
		if (!this.userLoaded) {
			this.cachedUser = await this.supabaseService.getUser(this.request)
			this.userLoaded = true
		}

		if (!this.cachedUser) {
			throw new UnauthorizedException('Authentication required')
		}

		return this.cachedUser
	}

	/**
	 * Get authenticated user ID (most common use case)
	 * @throws UnauthorizedException if user is not authenticated
	 */
	async getUserId(): Promise<string> {
		const user = await this.getUser()
		return user.id
	}

	/**
	 * Get authenticated user email
	 * @throws UnauthorizedException if user is not authenticated or email is not available
	 */
	async getUserEmail(): Promise<string> {
		const user = await this.getUser()
		if (!user.email) {
			throw new UnauthorizedException('User email not available')
		}
		return user.email
	}

	/**
	 * Check if user is authenticated (doesn't throw)
	 * Useful for optional authentication scenarios
	 */
	async isAuthenticated(): Promise<boolean> {
		if (!this.userLoaded) {
			this.cachedUser = await this.supabaseService.getUser(this.request)
			this.userLoaded = true
		}
		return this.cachedUser !== null
	}

	/**
	 * Get user if authenticated, null otherwise (doesn't throw)
	 * Useful for optional authentication scenarios
	 */
	async getUserOrNull(): Promise<authUser | null> {
		if (!this.userLoaded) {
			this.cachedUser = await this.supabaseService.getUser(this.request)
			this.userLoaded = true
		}
		return this.cachedUser
	}
}
