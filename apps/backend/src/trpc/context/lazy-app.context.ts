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
		console.log('🚀 LazyAppContext constructor called')
		console.log('📌 AuthService injected:', !!this.authService)
		console.log('📌 PrismaService injected:', !!this.prisma)
		console.log('📌 ModuleRef available:', !!moduleRef)
	}

	private async ensureServices() {
		// Try to get services from ModuleRef if not injected
		if (!this.authService) {
			try {
				this.authService = await this.moduleRef.get(AuthService, { strict: false })
				console.log('📌 Lazy-loaded AuthService from ModuleRef:', !!this.authService)
			} catch (error) {
				console.error('❌ Failed to get AuthService from ModuleRef:', error)
				throw new Error('AuthService not available')
			}
		}
		if (!this.prisma) {
			try {
				this.prisma = await this.moduleRef.get(PrismaService, { strict: false })
				console.log('📌 Lazy-loaded PrismaService from ModuleRef:', !!this.prisma)
			} catch (error) {
				console.error('❌ Failed to get PrismaService from ModuleRef:', error)
				throw new Error('PrismaService not available')
			}
		}
	}

	async create(opts: ContextOptions): Promise<Context> {
		await this.ensureServices()
		
		const { req, res } = opts
		
		// Extract token from Authorization header
		const authHeader = req.headers.authorization
		console.log('🔍 Auth header:', authHeader)
		const token = authHeader?.replace('Bearer ', '')
		
		let user: ValidatedUser | undefined
		
		if (token) {
			console.log('🔐 Attempting to validate token')
			if (!this.authService) {
				console.error('❌ authService is still undefined after lazy loading!')
				throw new Error('AuthService not available')
			}
			try {
				// Simplified - just trust Supabase validation
				user = await this.authService.validateSupabaseToken(token)
				console.log('✅ User validated:', user.email)
			} catch (error) {
				console.log('❌ Token validation failed:', error instanceof Error ? error.message : 'Unknown error')
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
			prisma: this.prisma!,
			authService: this.authService!,
		}
	}
}