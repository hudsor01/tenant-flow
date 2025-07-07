import {
	Controller,
	Get,
	Put,
	Body,
	UseGuards,
	Request,
	HttpException,
	HttpStatus,
	Post
} from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'
import { AuthService } from './auth.service'
import type { RequestWithUser } from './auth.types'
import {
	IsEmail,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
	MinLength
} from 'class-validator'

// DTOs for request validation
export class UpdateProfileDto {
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name?: string

	@IsOptional()
	@IsString()
	@MaxLength(20)
	phone?: string

	@IsOptional()
	@IsString()
	@MaxLength(500)
	bio?: string

	@IsOptional()
	@IsUrl()
	@MaxLength(500)
	avatarUrl?: string
}

export class SyncUserDto {
	@IsEmail()
	email!: string

	@IsOptional()
	@IsString()
	name?: string

	@IsOptional()
	@IsUrl()
	avatarUrl?: string
}

export class LoginDto {
	@IsEmail()
	email!: string

	@IsString()
	@MinLength(6)
	password!: string
}

export class RegisterDto {
	@IsEmail()
	email!: string

	@IsString()
	@MinLength(6)
	password!: string

	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name?: string
}

export class RefreshTokenDto {
	@IsString()
	refresh_token!: string
}

export class ForgotPasswordDto {
	@IsEmail()
	email!: string

	@IsOptional()
	@IsUrl()
	redirectTo?: string
}

export class ResetPasswordDto {
	@IsString()
	token!: string

	@IsString()
	@MinLength(6)
	password!: string
}

export class UpdatePasswordDto {
	@IsString()
	@MinLength(6)
	password!: string
}

export class VerifyEmailDto {
	@IsString()
	token!: string
}

export class ResendVerificationDto {
	@IsEmail()
	email!: string

	@IsOptional()
	@IsUrl()
	redirectTo?: string
}

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Login with email and password
	 */
	@Post('login')
	async login(@Body() loginDto: LoginDto) {
		try {
			const result = await this.authService.login(
				loginDto.email,
				loginDto.password
			)
			return result
		} catch {
			throw new HttpException(
				'Invalid credentials',
				HttpStatus.UNAUTHORIZED
			)
		}
	}

	/**
	 * Register new user
	 */
	@Post('register')
	async register(@Body() registerDto: RegisterDto) {
		try {
			const result = await this.authService.register(
				registerDto.email,
				registerDto.password,
				registerDto.name
			)
			return result
		} catch {
			throw new HttpException(
				'Registration failed',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Refresh access token
	 */
	@Post('refresh')
	async refresh(@Body() refreshDto: RefreshTokenDto) {
		try {
			const result = await this.authService.refreshToken(
				refreshDto.refresh_token
			)
			return result
		} catch {
			throw new HttpException(
				'Token refresh failed',
				HttpStatus.UNAUTHORIZED
			)
		}
	}

	/**
	 * Get current user profile
	 * This replaces the need for separate /users/me endpoint
	 */
	@Get('me')
	@UseGuards(JwtAuthGuard)
	async getCurrentUser(@Request() req: RequestWithUser) {
		try {
			const user = await this.authService.getUserBySupabaseId(req.user.id)

			if (!user) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			}

			// Return user data without sensitive information
			return {
				id: user.id,
				email: user.email,
				name: user.name,
				phone: user.phone,
				bio: user.bio,
				avatarUrl: user.avatarUrl,
				role: user.role,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			}
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to fetch user profile',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Update user profile
	 */
	@Put('profile')
	@UseGuards(JwtAuthGuard)
	async updateProfile(
		@Body() updateProfileDto: UpdateProfileDto,
		@Request() req: RequestWithUser
	) {
		try {
			const updatedUser = await this.authService.updateUserProfile(
				req.user.id,
				updateProfileDto
			)

			return {
				id: updatedUser.id,
				email: updatedUser.email,
				name: updatedUser.name,
				phone: updatedUser.phone,
				bio: updatedUser.bio,
				avatarUrl: updatedUser.avatarUrl,
				role: updatedUser.role,
				createdAt: updatedUser.createdAt,
				updatedAt: updatedUser.updatedAt
			}
		} catch {
			throw new HttpException(
				'Failed to update profile',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Sync user data from Supabase (useful for webhooks or manual sync)
	 */
	@Post('sync-user')
	@UseGuards(JwtAuthGuard)
	async syncUser(
		@Body() syncUserDto: SyncUserDto,
		@Request() req: RequestWithUser
	) {
		try {
			// Only allow users to sync their own data
			if (syncUserDto.email !== req.user.email) {
				throw new HttpException(
					'Cannot sync data for different user',
					HttpStatus.FORBIDDEN
				)
			}

			const supabaseUser = {
				id: req.user.id,
				email: syncUserDto.email,
				email_confirmed_at: new Date().toISOString(), // Assume verified if they have valid token
				user_metadata: {
					name: syncUserDto.name || '',
					avatar_url: syncUserDto.avatarUrl || ''
				},
				created_at:
					req.user.createdAt?.toISOString() ||
					new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			const syncedUser =
				await this.authService['syncUserWithDatabase'](supabaseUser)

			return {
				id: syncedUser.id,
				email: syncedUser.email,
				name: syncedUser.name,
				phone: syncedUser.phone,
				bio: syncedUser.bio,
				avatarUrl: syncedUser.avatarUrl,
				role: syncedUser.role,
				createdAt: syncedUser.createdAt,
				updatedAt: syncedUser.updatedAt
			}
		} catch {
			throw new HttpException(
				'Failed to sync user data',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Health check endpoint for authentication system
	 */
	@Get('health')
	async healthCheck() {
		return {
			status: 'ok',
			service: 'auth',
			timestamp: new Date().toISOString(),
			features: {
				supabaseIntegration: true,
				profileManagement: true,
				roleBasedAccess: true
			}
		}
	}

	/**
	 * Get user statistics (admin only)
	 */
	@Get('stats')
	@UseGuards(JwtAuthGuard)
	async getUserStats(@Request() req: RequestWithUser) {
		try {
			// Check if user is admin (you might want to create a separate AdminGuard)
			const user = await this.authService.getUserBySupabaseId(req.user.id)
			if (!user || user.role !== 'ADMIN') {
				throw new HttpException(
					'Insufficient permissions',
					HttpStatus.FORBIDDEN
				)
			}

			return await this.authService.getUserStats()
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to fetch user statistics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Initiate password reset
	 */
	@Post('forgot-password')
	async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
		try {
			await this.authService.forgotPassword(
				forgotPasswordDto.email,
				forgotPasswordDto.redirectTo
			)
			return { message: 'Password reset email sent' }
		} catch {
			throw new HttpException(
				'Failed to send password reset email',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Reset password with token
	 */
	@Post('reset-password')
	async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
		try {
			await this.authService.resetPassword(
				resetPasswordDto.token,
				resetPasswordDto.password
			)
			return { message: 'Password reset successfully' }
		} catch {
			throw new HttpException(
				'Password reset failed',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Update password when authenticated
	 */
	@Post('update-password')
	@UseGuards(JwtAuthGuard)
	async updatePassword(
		@Body() updatePasswordDto: UpdatePasswordDto,
		@Request() req: RequestWithUser
	) {
		try {
			await this.authService.updatePassword(
				req.user.id,
				updatePasswordDto.password
			)
			return { message: 'Password updated successfully' }
		} catch {
			throw new HttpException(
				'Failed to update password',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Verify email with token
	 */
	@Post('verify-email')
	async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
		try {
			await this.authService.verifyEmail(verifyEmailDto.token)
			return { message: 'Email verified successfully' }
		} catch {
			throw new HttpException(
				'Email verification failed',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Resend verification email
	 */
	@Post('resend-verification')
	async resendVerification(@Body() resendDto: ResendVerificationDto) {
		try {
			await this.authService.resendVerification(
				resendDto.email,
				resendDto.redirectTo
			)
			return { message: 'Verification email sent' }
		} catch {
			throw new HttpException(
				'Failed to send verification email',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	/**
	 * Logout user (invalidate token)
	 */
	@Post('logout')
	@UseGuards(JwtAuthGuard)
	async logout(@Request() req: RequestWithUser) {
		try {
			await this.authService.logout(req.user.id)
			return { message: 'Logged out successfully' }
		} catch {
			throw new HttpException('Logout failed', HttpStatus.BAD_REQUEST)
		}
	}

	/**
	 * Get current session info
	 */
	@Get('session')
	@UseGuards(JwtAuthGuard)
	async getSession(@Request() req: RequestWithUser) {
		try {
			const user = await this.authService.getUserBySupabaseId(req.user.id)
			if (!user) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			}

			return {
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role
				},
				isAuthenticated: true,
				sessionValid: true
			}
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to get session',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
