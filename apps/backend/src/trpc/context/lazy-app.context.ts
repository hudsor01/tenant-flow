import { Injectable, Inject, Optional } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
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
export class LazyAppContext {
	constructor(
		@Optional() @Inject(AuthService) private authService: AuthService,
		@Optional() @Inject(PrismaService) private prisma: PrismaService,
		private moduleRef: ModuleRef
	) {
		// SECURITY: Removed debug logging to prevent information disclosure
	}

	private async ensureServices() {
		// Try to get services from ModuleRef if not injected
		if (!this.authService) {
			try {
				this.authService = await this.moduleRef.get(AuthService, { strict: false })
			} catch {
				throw new Error('AuthService not available')
			}
		}
		if (!this.prisma) {
			try {
				this.prisma = await this.moduleRef.get(PrismaService, { strict: false })
			} catch {
				throw new Error('PrismaService not available')
			}
		}
	}

	async create(opts: ContextOptions): Promise<Context> {
		await this.ensureServices()
		
		const { req, res } = opts
		
		// Extract token from Authorization header
		const authHeader = req.headers.authorization
		// SECURITY: Removed auth header logging to prevent token exposure
		const token = authHeader?.replace('Bearer ', '')
		
		let user: ValidatedUser | undefined
		
		if (token) {
			if (!this.authService) {
				throw new Error('AuthService not available')
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
			prisma: this.prisma!,
			authService: this.authService!,
		}
	}
}