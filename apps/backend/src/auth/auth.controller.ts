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
import type { ValidatedUser } from '@repo/shared'
import type { Request } from 'express'
import { Public } from '../shared/decorators/auth.decorators'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { AuthGuard } from '../shared/guards/auth.guard'
import { AuthService } from './auth.service'
// Using Express JSON Schema validation - no DTOs needed
// Validation is handled by Express JSON schema at route level

@Controller('auth')
export class AuthController {
	// private readonly logger = new Logger(AuthController.name)

	constructor(private readonly authService: AuthService) {
		// Use proper dependency injection for security
	}

	/**
	 * Lightweight Auth health endpoint
	 * Verifies required env and basic Supabase connectivity
	 */
	@Get('health')
	@Public()
	@HttpCode(HttpStatus.OK)
	async health() {
		const envChecks = {
			supabase_url: Boolean(process.env.SUPABASE_URL),
			supabase_service_key: Boolean(process.env.SERVICE_ROLE_KEY)
		}

		let connected = false
		try {
			const result = await this.authService.testSupabaseConnection()
			connected = !!result.connected
		} catch {
			connected = false
		}

		const healthy =
			envChecks.supabase_url && envChecks.supabase_service_key && connected

		return {
			status: healthy ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV || (() => {
				throw new Error('NODE_ENV is required for auth health check reporting')
			})(),
			checks: {
				...envChecks,
				supabase_connection: connected
			}
		}
	}

	// Note: All auth operations are handled by Supabase directly
	// Auth endpoints are now implemented as standard NestJS routes
	// Profile updates available at: PUT /api/v1/users/profile

	@Get('me')
	@UseGuards(AuthGuard)
	async getCurrentUser(@CurrentUser() user: ValidatedUser) {
		const userProfile = await this.authService.getUserBySupabaseId(user.id)
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
	async login(
		@Body() body: { email: string; password: string },
		@Req() request: Request
	) {
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
	async register(
		@Body()
		body: {
			email: string
			password: string
			firstName: string
			lastName: string
		}
	) {
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
	async logout(@Req() request: Request) {
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

	/**
	 * Save form draft for persistence across sessions
	 * React 19 useFormState integration
	 */
	@Post('draft')
	@Public()
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	@HttpCode(HttpStatus.OK)
	async saveDraft(
		@Body()
		body: {
			email?: string
			name?: string
			formType: 'signup' | 'login' | 'reset'
		}
	) {
		return this.authService.saveDraft(body)
	}

	/**
	 * Retrieve form draft
	 * React 19 useFormState integration
	 */
	@Get('draft/:formType')
	@Public()
	@Throttle({ default: { limit: 20, ttl: 60000 } })
	async getDraft(
		@Body() body: { sessionId?: string },
		@Req() request: Request
	) {
		const sessionId =
			body.sessionId || (request.headers['x-session-id'] as string)
		return this.authService.getDraft(sessionId)
	}
}
