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
		private readonly prisma: PrismaService
	) {}

	async create(opts: ContextOptions): Promise<Context> {
		const { req, res } = opts
		
		// Extract token from Authorization header
		const authHeader = req.headers.authorization
		const token = authHeader?.replace('Bearer ', '')
		
		let user: ValidatedUser | undefined

		if (token) {
			try {
				// Use direct service validation - no need for lazy loading here
				user = await this.authService.validateSupabaseToken(token)
			} catch {
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