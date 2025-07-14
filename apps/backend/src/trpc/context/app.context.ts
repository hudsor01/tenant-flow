import { Injectable } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
import { PrismaService } from 'nestjs-prisma'
import type { User } from '@prisma/client'
import type { Request, Response } from 'express'

export interface Context {
	req: Request
	res: Response
	user?: User & { supabaseId: string }
	prisma: PrismaService
	authService: AuthService
}

export interface ContextOptions {
	req: Request
	res: Response
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
		
		let user: (User & { supabaseId: string }) | undefined
		
		if (token) {
			try {
				// Validate token using existing AuthService
				user = await this.authService.validateSupabaseToken(token)
			} catch (error: any) {
				// Don't throw here - let middleware handle auth requirements
				// This allows public procedures to work
				console.warn('Token validation failed:', error.message)
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