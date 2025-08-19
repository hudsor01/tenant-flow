import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { AuthService, ValidatedUser } from './auth.service'
import { Public } from './decorators/public.decorator'
import {
	AuthRateLimits,
	RateLimit
} from '../common/decorators/rate-limit.decorator'
import { CsrfExempt, CsrfGuard } from '../common/guards/csrf.guard'
import { FastifyRequest } from 'fastify'

@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
	constructor(
		private readonly moduleRef: ModuleRef,
		private readonly authService: AuthService
	) {}

	// Note: All auth operations are handled by Supabase directly
	// Auth endpoints are now implemented as standard NestJS routes
	// Profile updates available at: PUT /api/v1/users/profile

	@Get('me')
	@UseGuards(JwtAuthGuard)
	async getCurrentUser(@CurrentUser() user: ValidatedUser) {
		// Dynamically resolve UsersService to avoid circular dependency
		const { UsersService } = await import('../users/users.service')
		const usersService = this.moduleRef.get(UsersService, { strict: false })
		const userProfile = await usersService.getUserById(user.id)
		if (!userProfile) {
			throw new Error('User not found')
		}
		return userProfile
	}

	/**
	 * Refresh access token using refresh token
	 * Implements secure token rotation
	 * SECURITY: Token refresh is exempt from CSRF as it uses existing valid tokens
	 */
	@Post('refresh')
	@Public()
	@CsrfExempt() // Token refresh uses existing authentication
	@RateLimit(AuthRateLimits.REFRESH_TOKEN)
	@HttpCode(HttpStatus.OK)
	async refreshToken(@Body() body: { refresh_token: string }) {
		return this.authService.refreshToken(body.refresh_token)
	}

	/**
	 * Login endpoint
	 * SECURITY: Login is exempt from CSRF as it establishes the session
	 * but uses aggressive rate limiting instead
	 */
	@Post('login')
	@Public()
	@CsrfExempt()
	@RateLimit(AuthRateLimits.LOGIN)
	@HttpCode(HttpStatus.OK)
	async login(
		@Body() body: { email: string; password: string },
		@Req() request: FastifyRequest
	) {
		const ip =
			request.ip ||
			(request.headers['x-forwarded-for'] as string) ||
			'unknown'
		return this.authService.login(body.email, body.password, ip)
	}

	/**
	 * Register new user endpoint
	 * SECURITY: Registration is exempt from CSRF as it creates new accounts
	 * but uses aggressive rate limiting instead
	 */
	@Post('register')
	@Public()
	@CsrfExempt()
	@RateLimit(AuthRateLimits.REGISTER)
	@HttpCode(HttpStatus.CREATED)
	async register(
		@Body() body: { email: string; password: string; name: string }
	) {
		return this.authService.createUser(body)
	}

	/**
	 * Logout endpoint
	 */
	@Post('logout')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async logout(@Req() request: FastifyRequest) {
		const authHeader = request.headers.authorization
		const token = authHeader?.split(' ')[1] || ''
		await this.authService.logout(token)
		return { success: true }
	}
}
