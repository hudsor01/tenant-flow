import { Controller, Get, Post, Body, UseGuards, UseInterceptors, HttpCode, HttpStatus, Req } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from './decorators/current-user.decorator'
import { ValidatedUser, AuthService } from './auth.service'
import { Public } from './decorators/public.decorator'
import { RateLimit, AuthRateLimits } from '../common/decorators/rate-limit.decorator'
import { FastifyRequest } from 'fastify'

@Controller('auth')
@UseInterceptors(ErrorHandlingInterceptor)
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
     */
    @Post('refresh')
    @Public()
    @RateLimit(AuthRateLimits.REFRESH_TOKEN)
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() body: { refresh_token: string }) {
        return await this.authService.refreshToken(body.refresh_token)
    }

    /**
     * Login endpoint
     */
    @Post('login')
    @Public()
    @RateLimit(AuthRateLimits.LOGIN)
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: { email: string; password: string }) {
        return await this.authService.login(body.email, body.password)
    }

    /**
     * Register new user endpoint
     */
    @Post('register')
    @Public()
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
