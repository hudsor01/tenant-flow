import { Injectable } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
import { PrismaService } from 'nestjs-prisma'
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
	) {}

	async create(opts: ContextOptions): Promise<Context> {
		const { req, res } = opts
		
		// Extract token from Authorization header
		const token = req.headers.authorization?.replace('Bearer ', '')
		
		let user: ValidatedUser | undefined
		
		if (token) {
			try {
				// Simplified - just trust Supabase validation
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