/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct service calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Patch,
	Post,
	Req,
	Res,
	Param,
	UseInterceptors,
	UploadedFile
} from '@nestjs/common'
import type { Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { decode, JwtPayload } from 'jsonwebtoken'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import { createThrottleDefaults } from '../../config/throttle.config'

// GDPR data export: 1 per hour — prevents bulk data harvesting
const GDPR_EXPORT_THROTTLE = createThrottleDefaults({
	envTtlKey: 'GDPR_EXPORT_THROTTLE_TTL',
	envLimitKey: 'GDPR_EXPORT_THROTTLE_LIMIT',
	defaultTtl: 3600000,
	defaultLimit: 1
})

// Account deletion: 3 per hour — prevent accidental/malicious cascade
const GDPR_DELETE_THROTTLE = createThrottleDefaults({
	envTtlKey: 'GDPR_DELETE_THROTTLE_TTL',
	envLimitKey: 'GDPR_DELETE_THROTTLE_LIMIT',
	defaultTtl: 3600000,
	defaultLimit: 3
})

// Avatar upload: 10 per hour — prevent storage abuse
const AVATAR_UPLOAD_THROTTLE = createThrottleDefaults({
	envTtlKey: 'AVATAR_UPLOAD_THROTTLE_TTL',
	envLimitKey: 'AVATAR_UPLOAD_THROTTLE_LIMIT',
	defaultTtl: 3600000,
	defaultLimit: 10
})
import { UsersService } from './users.service'
import { ProfileService } from './profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateTourProgressDto } from './dto/update-tour-progress.dto'
import { UpdatePhoneDto } from './dto/update-phone.dto'
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto'
import { UpdateOnboardingDto } from './dto/update-onboarding.dto'
import { AppLogger } from '../../logger/app-logger.service'
import { UserToursService } from './user-tours.service'
import { UserSessionsService } from './user-sessions.service'

@ApiTags('Users')
@ApiBearerAuth('supabase-auth')
@Controller('users')
export class UsersController {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly usersService: UsersService,
		private readonly profileService: ProfileService,
		private readonly userToursService: UserToursService,
		private readonly userSessionsService: UserSessionsService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Export all user data (GDPR/CCPA data portability right)
	 *
	 * Returns a JSON file containing all data associated with the authenticated user.
	 * Rate limited to 1 request per hour per user.
	 */
	@ApiOperation({ summary: 'Export user data', description: 'GDPR/CCPA: Download all personal data as JSON' })
	@ApiResponse({ status: 200, description: 'User data exported successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('me/export')
	@Throttle({ default: GDPR_EXPORT_THROTTLE })
	@SkipSubscriptionCheck()
	async exportMyData(
		@Req() req: AuthenticatedRequest,
		@Res() res: Response
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		this.logger.log('User data export requested', { user_id: req.user.id })

		const exportData = await this.usersService.exportUserData(req.user.id)
		const jsonString = JSON.stringify(exportData, null, 2)
		const filename = `tenantflow-data-export-${new Date().toISOString().split('T')[0]}.json`

		res.setHeader('Content-Type', 'application/json')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(jsonString)
	}

	/**
	 * Update onboarding status for current user
	 *
	 * Marks onboarding as started, completed, or skipped.
	 * Sets onboarding_completed_at when status is 'completed'.
	 */
	@ApiOperation({ summary: 'Update onboarding status', description: 'Update onboarding wizard progress for the current user' })
	@ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: ['started', 'completed', 'skipped'] } }, required: ['status'] } })
	@ApiResponse({ status: 200, description: 'Onboarding status updated successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Patch('me/onboarding')
	@SkipSubscriptionCheck()
	async updateOnboarding(
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdateOnboardingDto
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		this.logger.debug('Updating onboarding status', {
			user_id: req.user.id,
			status: dto.status
		})

		await this.usersService.updateOnboarding(req.user.id, dto.status)

		this.logger.log('Onboarding status updated', {
			user_id: req.user.id,
			status: dto.status
		})

		return { success: true, status: dto.status }
	}

	/**
	 * Delete user account (GDPR/CCPA right to erasure)
	 *
	 * Soft-deletes the user account, deactivates all properties and leases.
	 * Auth session is immediately revoked.
	 */
	@ApiOperation({ summary: 'Delete account', description: 'GDPR/CCPA: Permanently delete account and all associated data' })
	@ApiResponse({ status: 200, description: 'Account deletion initiated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('me')
	@Throttle({ default: GDPR_DELETE_THROTTLE })
	@SkipSubscriptionCheck()
	async deleteMyAccount(@Req() req: AuthenticatedRequest) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		this.logger.log('Account deletion requested', { user_id: req.user.id })

		await this.usersService.deleteAccount(req.user.id)

		this.logger.log('Account deleted successfully', { user_id: req.user.id })

		return {
			success: true,
			message: 'Your account has been deleted. All sessions have been revoked.'
		}
	}

	/**
	 * Get current user with Stripe customer ID
	 *
	 * This endpoint joins auth.users (from JWT) with stripe.customers (from Sync Engine)
	 * to provide the user's Stripe customer ID for Customer Portal access
	 *
	 * Returns:
	 * - id: auth.users.id (from JWT)
	 * - email: auth.users.email (from JWT)
	 * - stripe_customer_id: stripe.customers.id (from Stripe Sync Engine)
	 */
	@ApiOperation({ summary: 'Get current user', description: 'Get current authenticated user with Stripe customer ID' })
	@ApiResponse({ status: 200, description: 'Current user retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'User email not found' })
	@Get('me')
	@SkipSubscriptionCheck()
	async getCurrentUser(@Req() req: AuthenticatedRequest) {
		const authuser_id = req.user.id // auth.users.id from JWT
		const authUserEmail = req.user.email

		if (!authUserEmail) {
			throw new NotFoundException(
				'User email not found in authentication token'
			)
		}

		this.logger.debug('Fetching current user data', {
			user_id: authuser_id,
			email: authUserEmail
		})

		// Get Stripe customer ID using the indexed user_id column
		// stripe.customers is auto-populated by Stripe Sync Engine
		// user_id column is set by webhook when customer.created/updated events occur
		let stripe_customer_id: string | null = null

		try {
			const { data, error } = await this.supabaseService!.rpc(
				'get_stripe_customer_by_user_id',
				{ p_user_id: authuser_id },
				{ maxAttempts: 2 }
			)

			if (error) {
				this.logger.warn('Could not fetch Stripe customer ID', {
					error: error.message || String(error),
					user_id: authuser_id
				})
			} else {
				stripe_customer_id = (data as string) || null
			}
		} catch (error) {
			// If function doesn't exist yet or stripe schema not ready,
			// gracefully degrade to null customer ID
			this.logger.debug('Stripe customer lookup not available', {
				error: error instanceof Error ? error.message : String(error)
			})
		}

		const response = {
			id: authuser_id,
			email: authUserEmail,
			stripe_customer_id
		}

		this.logger.debug('Current user data fetched', {
			user_id: authuser_id,
			hasStripeCustomer: !!stripe_customer_id
		})

		return response
	}

	/**
	 * Get full user profile with role-specific data
	 *
	 * Returns profile with:
	 * - Base user info (name, email, phone, avatar)
	 * - For tenants: emergency contact, current lease info
	 * - For owners: Stripe connection status, property/unit counts
	 */
	@ApiOperation({ summary: 'Get user profile', description: 'Get full user profile with role-specific data' })
	@ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('profile')
	@SkipSubscriptionCheck()
	async getProfile(@Req() req: AuthenticatedRequest) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		this.logger.debug('Fetching user profile', { user_id: req.user.id })

		return this.profileService.getProfile(token, req.user.id)
	}

	/**
	 * Update current user's profile
	 *
	 * Updates the authenticated user's profile information including:
	 * - first_name, last_name
	 * - email (must be unique)
	 * - phone, company, timezone, bio
	 */
	@ApiOperation({ summary: 'Update profile', description: 'Update current user profile information' })
	@ApiResponse({ status: 200, description: 'Profile updated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Patch('profile')
	@SkipSubscriptionCheck()
	async updateProfile(
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdateProfileDto
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		const user_id = req.user.id

		this.logger.debug('Updating user profile', {
			user_id,
			fields: Object.keys(dto)
		})

		const updatedUser = await this.usersService.updateUser(token, user_id, {
			first_name: dto.first_name,
			last_name: dto.last_name,
			email: dto.email,
			phone: dto.phone ?? null
		})

		this.logger.log('User profile updated successfully', { user_id })

		return {
			id: updatedUser.id,
			first_name: updatedUser.first_name,
			last_name: updatedUser.last_name,
			email: updatedUser.email,
			phone: updatedUser.phone
		}
	}

	/**
	 * Upload user avatar
	 *
	 * Accepts image file (JPEG, PNG, GIF, WebP) up to 5MB
	 * Stores in Supabase Storage and updates user record
	 */
	@ApiOperation({ summary: 'Upload avatar', description: 'Upload user avatar image (JPEG, PNG, GIF, WebP up to 5MB)' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({ schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } })
	@ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required or invalid file' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('avatar')
	@Throttle({ default: AVATAR_UPLOAD_THROTTLE })
	@SkipSubscriptionCheck()
	@UseInterceptors(FileInterceptor('avatar'))
	async uploadAvatar(
		@Req() req: AuthenticatedRequest,
		@UploadedFile() file: Express.Multer.File
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		this.logger.debug('Uploading avatar', {
			user_id: req.user.id,
			fileSize: file?.size,
			mimeType: file?.mimetype
		})

		return this.profileService.uploadAvatar(token, req.user.id, file)
	}

	/**
	 * Remove user avatar
	 *
	 * Deletes avatar from storage and clears avatar_url in user record
	 */
	@ApiOperation({ summary: 'Remove avatar', description: 'Delete user avatar from storage' })
	@ApiResponse({ status: 200, description: 'Avatar removed successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('avatar')
	@SkipSubscriptionCheck()
	async removeAvatar(@Req() req: AuthenticatedRequest) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		this.logger.debug('Removing avatar', { user_id: req.user.id })

		await this.profileService.removeAvatar(token, req.user.id)

		return { success: true, message: 'Avatar removed successfully' }
	}

	/**
	 * Update phone number
	 *
	 * Validates phone format and updates user record
	 */
	@ApiOperation({ summary: 'Update phone', description: 'Update user phone number' })
	@ApiBody({ schema: { type: 'object', properties: { phone: { type: 'string', nullable: true } }, required: ['phone'] } })
	@ApiResponse({ status: 200, description: 'Phone updated successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Patch('phone')
	@SkipSubscriptionCheck()
	async updatePhone(
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdatePhoneDto
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		this.logger.debug('Updating phone number', { user_id: req.user.id })

		return this.profileService.updatePhone(token, req.user.id, dto.phone)
	}

	/**
	 * Update emergency contact (for tenants)
	 *
	 * Updates emergency contact information in tenant record
	 */
	@ApiOperation({ summary: 'Update emergency contact', description: 'Update tenant emergency contact information' })
	@ApiBody({ schema: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, relationship: { type: 'string' } }, required: ['name', 'phone', 'relationship'] } })
	@ApiResponse({ status: 200, description: 'Emergency contact updated successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required or missing fields' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Patch('emergency-contact')
	@SkipSubscriptionCheck()
	async updateEmergencyContact(
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdateEmergencyContactDto
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		// Zod DTO validates all fields, no manual check needed

		this.logger.debug('Updating emergency contact', { user_id: req.user.id })

		await this.profileService.updateEmergencyContact(token, req.user.id, dto)

		return { success: true, message: 'Emergency contact updated successfully' }
	}

	/**
	 * Remove emergency contact (for tenants)
	 *
	 * Clears emergency contact information from tenant record
	 */
	@ApiOperation({ summary: 'Remove emergency contact', description: 'Clear tenant emergency contact information' })
	@ApiResponse({ status: 200, description: 'Emergency contact removed successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('emergency-contact')
	@SkipSubscriptionCheck()
	async removeEmergencyContact(@Req() req: AuthenticatedRequest) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		this.logger.debug('Removing emergency contact', { user_id: req.user.id })

		await this.profileService.clearEmergencyContact(token, req.user.id)

		return { success: true, message: 'Emergency contact removed successfully' }
	}

	/**
	 * Get all active sessions for the current user
	 *
	 * Returns a list of all active sessions with device/browser info.
	 * The current session is marked with is_current: true
	 */
	@ApiOperation({ summary: 'Get sessions', description: 'Get all active sessions for current user' })
	@ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('sessions')
	@SkipSubscriptionCheck()
	async getSessions(@Req() req: AuthenticatedRequest) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')

		// Extract session_id from the JWT payload
		// The JWT has already been verified by the auth guard
		let currentSessionId: string | undefined
		if (token) {
			try {
				const decoded = decode(token) as JwtPayload | null
				currentSessionId = decoded?.session_id as string | undefined
			} catch {
				this.logger.debug('Could not decode JWT for session_id extraction')
			}
		}

		this.logger.debug('Fetching user sessions', {
			user_id: req.user.id,
			currentSessionId
		})

		const sessions = await this.userSessionsService.getUserSessions(
			req.user.id,
			currentSessionId
		)

		return { sessions }
	}

	/**
	 * Revoke a specific session
	 *
	 * Terminates the specified session, logging the user out of that device.
	 * Users cannot revoke their current session through this endpoint.
	 */
	@ApiOperation({ summary: 'Revoke session', description: 'Terminate a specific session (cannot revoke current session)' })
	@ApiParam({ name: 'sessionId', type: 'string', description: 'Session ID to revoke' })
	@ApiResponse({ status: 200, description: 'Session revoked successfully' })
	@ApiResponse({ status: 400, description: 'Cannot revoke current session' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('sessions/:sessionId')
	@SkipSubscriptionCheck()
	async revokeSession(
		@Req() req: AuthenticatedRequest,
		@Param('sessionId') sessionId: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')

		// Extract current session_id from JWT to prevent self-revocation
		let currentSessionId: string | undefined
		if (token) {
			try {
				const decoded = decode(token) as JwtPayload | null
				currentSessionId = decoded?.session_id as string | undefined
			} catch {
				// If we can't decode, allow the operation (backend will validate)
			}
		}

		// Prevent users from revoking their current session
		if (currentSessionId && currentSessionId === sessionId) {
			throw new BadRequestException(
				'Cannot revoke current session. Use logout instead.'
			)
		}

		this.logger.debug('Revoking session', {
			user_id: req.user.id,
			sessionId
		})

		await this.userSessionsService.revokeSession(req.user.id, sessionId)

		return { success: true, message: 'Session revoked successfully' }
	}

	/**
	 * Get onboarding tour progress for current user
	 */
	@ApiOperation({ summary: 'Get tour progress', description: 'Get onboarding tour progress for current user' })
	@ApiParam({ name: 'tourKey', type: 'string', description: 'Tour identifier key' })
	@ApiResponse({ status: 200, description: 'Tour progress retrieved successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('tours/:tourKey')
	@SkipSubscriptionCheck()
	async getTourProgress(
		@Req() req: AuthenticatedRequest,
		@Param('tourKey') tourKey: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		return this.userToursService.getTourProgress(token, req.user.id, tourKey)
	}

	/**
	 * Update onboarding tour progress for current user
	 */
	@ApiOperation({ summary: 'Update tour progress', description: 'Update onboarding tour progress for current user' })
	@ApiParam({ name: 'tourKey', type: 'string', description: 'Tour identifier key' })
	@ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'skipped'] }, current_step: { type: 'number' } } } })
	@ApiResponse({ status: 200, description: 'Tour progress updated successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Patch('tours/:tourKey')
	@SkipSubscriptionCheck()
	async updateTourProgress(
		@Req() req: AuthenticatedRequest,
		@Param('tourKey') tourKey: string,
		@Body() dto: UpdateTourProgressDto
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		return this.userToursService.updateTourProgress(token, req.user.id, tourKey, {
			...(dto.status !== undefined && { status: dto.status }),
			...(dto.current_step !== undefined && { current_step: dto.current_step })
		})
	}

	/**
	 * Reset onboarding tour progress for current user
	 */
	@ApiOperation({ summary: 'Reset tour progress', description: 'Reset onboarding tour progress for current user' })
	@ApiParam({ name: 'tourKey', type: 'string', description: 'Tour identifier key' })
	@ApiResponse({ status: 200, description: 'Tour progress reset successfully' })
	@ApiResponse({ status: 400, description: 'Authentication required' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('tours/:tourKey/reset')
	@SkipSubscriptionCheck()
	async resetTourProgress(
		@Req() req: AuthenticatedRequest,
		@Param('tourKey') tourKey: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new BadRequestException('Authorization token required')
		}

		return this.userToursService.resetTourProgress(token, req.user.id, tourKey)
	}
}
