import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
	ValidationPipe
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { Throttle } from '@nestjs/throttler'
import { UnifiedAuthGuard } from '../shared/guards/unified-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthService, ValidatedUser } from './auth.service'
import { Public } from '../shared/decorators/auth.decorators'
import { CsrfExempt, CsrfGuard } from '../security/csrf.guard'
import { FastifyRequest } from 'fastify'
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto'
import { SuccessResponseUtil } from '../shared/utils/success-response.util'

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
	@UseGuards(UnifiedAuthGuard)
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
	@Throttle({ default: { limit: 20, ttl: 60000 } })
	@HttpCode(HttpStatus.OK)
	async refreshToken(@Body(ValidationPipe) body: RefreshTokenDto) {
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
	@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
	@HttpCode(HttpStatus.OK)
	async login(
		@Body(ValidationPipe) body: LoginDto,
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
	@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registration attempts per minute
	@HttpCode(HttpStatus.CREATED)
	async register(
		@Body(ValidationPipe) body: RegisterDto
	) {
		return this.authService.createUser(body)
	}

	/**
	 * Logout endpoint
	 */
	@Post('logout')
	@UseGuards(UnifiedAuthGuard)
	@HttpCode(HttpStatus.OK)
	async logout(@Req() request: FastifyRequest) {
		const authHeader = request.headers.authorization
		const token = authHeader?.split(' ')[1] || ''
		await this.authService.logout(token)
		return SuccessResponseUtil.success()
	}
}
