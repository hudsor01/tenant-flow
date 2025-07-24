import { Injectable } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { ValidatedUser } from '../../auth/auth.service'
import type { FastifyRequest, FastifyReply } from 'fastify'

export interface Context {
	req: FastifyRequest
	res: FastifyReply
	user?: ValidatedUser
	prisma: PrismaService
	authService: AuthService
}

export interface ContextOptions {
	req: FastifyRequest
	res: FastifyReply
}

@Injectable()
export class AppContext {
	constructor(
		private readonly authService: AuthService,
		private readonly prisma: PrismaService,
	) {
		// SECURITY: Removed debug logging to prevent information disclosure
		if (!this.authService) {
			throw new Error('AuthService was not injected in constructor!')
		}
	}

	async create(opts: ContextOptions): Promise<Context> {
		const { req, res } = opts
		
		// Extract token from Authorization header
		const authHeader = req.headers.authorization
		// SECURITY: Removed auth header logging to prevent token exposure
		const token = authHeader?.replace('Bearer ', '')
		
		let user: ValidatedUser | undefined
		
		if (token) {
			if (!this.authService) {
				throw new Error('AuthService not injected')
			}
			try {
				// Simplified - just trust Supabase validation
				user = await this.authService.validateSupabaseToken(token)
				// SECURITY: Removed user email logging
			} catch {
				// SECURITY: Removed error logging to prevent information disclosure
				// Don't throw here - let middleware handle auth requirements
				// This allows public procedures to work
				user = undefined
			}
		}

		return {
			req,
			res,
			user,
			prisma: this.prisma,
			authService: this.authService,
		}
	}
}