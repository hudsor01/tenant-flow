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
	Param,
	UseInterceptors,
	UploadedFile
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { decode, JwtPayload } from 'jsonwebtoken'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import { UsersService } from './users.service'
import { ProfileService } from './profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { AppLogger } from '../../logger/app-logger.service'
import { UserToursService } from './user-tours.service'
import { UserSessionsService } from './user-sessions.service'

type UpdateTourProgressBody = {
	status?: 'not_started' | 'in_progress' | 'completed' | 'skipped'
	current_step?: number
}

type UpdatePhoneBody = {
	phone: string | null
}

type UpdateEmergencyContactBody = {
	name: string
	phone: string
	relationship: string
}

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
			const { data, error } = await this.supabaseService!.rpcWithRetries(
				'get_stripe_customer_by_user_id',
				{ p_user_id: authuser_id },
				2 // Only 2 attempts for fast failure
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
	@Get('profile')
	@SkipSubscriptionCheck()
	async getProfile(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
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
	@Patch('profile')
	@SkipSubscriptionCheck()
	async updateProfile(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdateProfileDto
	) {
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
	@Post('avatar')
	@SkipSubscriptionCheck()
	@UseInterceptors(FileInterceptor('avatar'))
	async uploadAvatar(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest,
		@UploadedFile() file: Express.Multer.File
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
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
	@Delete('avatar')
	@SkipSubscriptionCheck()
	async removeAvatar(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
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
	@Patch('phone')
	@SkipSubscriptionCheck()
	async updatePhone(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest,
		@Body() body: UpdatePhoneBody
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		this.logger.debug('Updating phone number', { user_id: req.user.id })

		return this.profileService.updatePhone(token, req.user.id, body.phone)
	}

	/**
	 * Update emergency contact (for tenants)
	 *
	 * Updates emergency contact information in tenant record
	 */
	@Patch('emergency-contact')
	@SkipSubscriptionCheck()
	async updateEmergencyContact(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest,
		@Body() body: UpdateEmergencyContactBody
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		if (!body.name || !body.phone || !body.relationship) {
			throw new BadRequestException(
				'Name, phone, and relationship are required'
			)
		}

		this.logger.debug('Updating emergency contact', { user_id: req.user.id })

		await this.profileService.updateEmergencyContact(token, req.user.id, body)

		return { success: true, message: 'Emergency contact updated successfully' }
	}

	/**
	 * Remove emergency contact (for tenants)
	 *
	 * Clears emergency contact information from tenant record
	 */
	@Delete('emergency-contact')
	@SkipSubscriptionCheck()
	async removeEmergencyContact(
		@JwtToken() token: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
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
	@Get('sessions')
	@SkipSubscriptionCheck()
	async getSessions(
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		// Extract session_id from the JWT payload
		// The JWT has already been verified by the auth guard
		let currentSessionId: string | undefined
		try {
			const decoded = decode(token) as JwtPayload | null
			currentSessionId = decoded?.session_id as string | undefined
		} catch {
			this.logger.debug('Could not decode JWT for session_id extraction')
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
	@Delete('sessions/:sessionId')
	@SkipSubscriptionCheck()
	async revokeSession(
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Param('sessionId') sessionId: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		// Extract current session_id from JWT to prevent self-revocation
		let currentSessionId: string | undefined
		try {
			const decoded = decode(token) as JwtPayload | null
			currentSessionId = decoded?.session_id as string | undefined
		} catch {
			// If we can't decode, allow the operation (backend will validate)
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
	@Get('tours/:tourKey')
	@SkipSubscriptionCheck()
	async getTourProgress(
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Param('tourKey') tourKey: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		return this.userToursService.getTourProgress(token, req.user.id, tourKey)
	}

	/**
	 * Update onboarding tour progress for current user
	 */
	@Patch('tours/:tourKey')
	@SkipSubscriptionCheck()
	async updateTourProgress(
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Param('tourKey') tourKey: string,
		@Body() body: UpdateTourProgressBody
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		return this.userToursService.updateTourProgress(
			token,
			req.user.id,
			tourKey,
			body
		)
	}

	/**
	 * Reset onboarding tour progress for current user
	 */
	@Post('tours/:tourKey/reset')
	@SkipSubscriptionCheck()
	async resetTourProgress(
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Param('tourKey') tourKey: string
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		return this.userToursService.resetTourProgress(token, req.user.id, tourKey)
	}
}
