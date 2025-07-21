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
		console.log('🚀 AppContext constructor called')
		console.log('📌 authService:', !!this.authService)
		console.log('📌 authService type:', typeof this.authService)
		console.log('📌 authService constructor:', this.authService?.constructor?.name)
		console.log('📌 prisma:', !!this.prisma)
		console.log('📌 prisma type:', typeof this.prisma)
		console.log('📌 prisma constructor:', this.prisma?.constructor?.name)
		
		if (!this.authService) {
			console.error('❌ AuthService was not injected in constructor!')
			console.trace('Stack trace:')
		}
	}

	async create(opts: ContextOptions): Promise<Context> {
		const { req, res } = opts
		
		// Extract token from Authorization header
		const authHeader = req.headers.authorization
		console.log('🔍 Auth header:', authHeader)
		const token = authHeader?.replace('Bearer ', '')
		
		let user: ValidatedUser | undefined
		
		if (token) {
			console.log('🔐 Attempting to validate token')
			console.log('🔍 authService exists?', !!this.authService)
			if (!this.authService) {
				console.error('❌ authService is undefined!')
				throw new Error('AuthService not injected')
			}
			try {
				// Simplified - just trust Supabase validation
				user = await this.authService.validateSupabaseToken(token)
				console.log('✅ User validated:', user.email)
			} catch (error) {
				console.log('❌ Token validation failed:', error)
				// Don't throw here - let middleware handle auth requirements
				// This allows public procedures to work
				user = undefined
			}
		} else {
			console.log('⚠️ No token provided')
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