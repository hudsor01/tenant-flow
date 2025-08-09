import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
// Error handling is now managed by global ErrorHandler
import { CurrentUser } from './decorators/current-user.decorator'
import { ValidatedUser, AuthService } from './auth.service'
import { Public } from './decorators/public.decorator'
import { RateLimit, AuthRateLimits } from '../common/decorators/rate-limit.decorator'
import { CsrfGuard, CsrfExempt } from '../common/guards/csrf.guard'
import { FastifyRequest } from 'fastify'

@Controller('auth')
// Error handling is now managed by global ErrorHandler
@UseGuards(CsrfGuard) // Apply CSRF protection to all auth endpoints
export class AuthController {
    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService
    ) { }

    // Note: All auth operations are handled by Supabase directly
    // Auth endpoints are now implemented as standard NestJS routes
    // Profile updates available at: PUT /api/v1/users/profile

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getCurrentUser(@CurrentUser() user: ValidatedUser) {
        const userProfile = await this.usersService.getUserById(user.id)
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
        return await this.authService.refreshToken(body.refresh_token)
    }

    /**
     * Login endpoint
     * SECURITY: Login is exempt from CSRF as it establishes the session
     * but uses aggressive rate limiting instead
     */
    @Post('login')
    @Public()
    @CsrfExempt() // Login forms typically exempt from CSRF
    @RateLimit(AuthRateLimits.LOGIN)
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: { email: string; password: string }) {
        return await this.authService.login(body.email, body.password)
    }

    /**
     * Register new user endpoint
     * SECURITY: Registration is exempt from CSRF as it creates new accounts
     * but uses aggressive rate limiting instead
     */
    @Post('register')
    @Public()
    @CsrfExempt() // Registration forms typically exempt from CSRF
    @RateLimit(AuthRateLimits.REGISTER)
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() body: { email: string; password: string; name: string }) {
        return await this.authService.createUser(body)
    }

    /**
     * Logout endpoint
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Req() request: FastifyRequest) {
        // Extract token from the Authorization header
        const authHeader = request.headers.authorization
        const token = authHeader?.split(' ')[1] || ''
        await this.authService.logout(token)
        return { success: true }
    }
}
