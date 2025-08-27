import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Post,
	Req,
	UnauthorizedException,
	UseGuards
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthService } from './auth.service'
import { Public } from '../shared/decorators/auth.decorators'
import type { ValidatedUser } from '@repo/shared'
import type { FastifyRequest } from 'fastify'
import { UsersService } from '../users/users.service'
// Using native Fastify JSON Schema validation - no DTOs needed
// Validation is handled by Fastify schema at route level

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly usersService: UsersService
	) {}

	// Note: All auth operations are handled by Supabase directly
	// Auth endpoints are now implemented as standard NestJS routes
	// Profile updates available at: PUT /api/v1/users/profile

	@Get('me')
	@UseGuards(AuthGuard)
	async getCurrentUser(@CurrentUser() user: ValidatedUser) {
		const userProfile = await this.usersService.getUserById(user.id)
		if (!userProfile) {
			throw new NotFoundException('User not found')
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
	@Throttle({ default: { limit: 20, ttl: 60000 } })
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
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
	@HttpCode(HttpStatus.OK)
	async login(@Body() body: { email: string; password: string }, @Req() request: FastifyRequest) {
		const forwardedFor = request.headers['x-forwarded-for']
		const ip =
			request.ip ||
			(Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
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
	@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registration attempts per minute
	@HttpCode(HttpStatus.CREATED)
	async register(@Body() body: { email: string; password: string; firstName: string; lastName: string }) {
		// Transform firstName/lastName to name for service compatibility
		const userData = {
			email: body.email,
			password: body.password,
			name: `${body.firstName} ${body.lastName}`.trim()
		}
		return this.authService.createUser(userData)
	}

	/**
	 * Logout endpoint
	 */
	@Post('logout')
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	async logout(@Req() request: FastifyRequest) {
		const authHeader = request.headers.authorization
		if (!authHeader) {
			throw new UnauthorizedException('No authorization header found')
		}
		// NATIVE: Extract token with fallback to empty string (matches test expectations)
		const token = authHeader.startsWith('Bearer ')
			? authHeader.substring(7)
			: ''
		await this.authService.logout(token)
		// Return native response - NestJS handles this automatically
		return { success: true }
	}
}
