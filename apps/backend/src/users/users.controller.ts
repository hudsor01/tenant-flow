import {
	Controller,
	Get,
	Post,
	Put,
	Param,
	Body,
	Request,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
// import type { MultipartFile } from '@fastify/multipart'
import type { RequestWithUser } from '../auth/auth.types'
import { UsersService } from './users.service'
import { StorageService } from '../storage/storage.service'
import type { UserCreationResult } from './users.service'
import { validateAvatarFile, multipartFileToBuffer } from '../common/file-upload.decorators'

interface EnsureUserExistsDto {
	authUser: {
		id: string
		email: string
		user_metadata?: {
			name?: string
			full_name?: string
		}
	}
	options?: {
		role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
		name?: string
		maxRetries?: number
		retryDelayMs?: number
	}
}

interface UpdateUserProfileDto {
	name?: string
	phone?: string
	bio?: string
	avatarUrl?: string
}

@Controller('users')
export class UsersController {
	constructor(
		private readonly usersService: UsersService,
		private readonly storageService: StorageService
	) {}

	@Get('me')
		async getCurrentUser(@Request() req: RequestWithUser) {
		try {
			const user = await this.usersService.getUserById(req.user.id)
			if (!user) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND)
			}
			return user
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

	@Put('profile')
		async updateProfile(
		@Request() req: RequestWithUser,
		@Body() updateDto: UpdateUserProfileDto
	) {
		try {
			return await this.usersService.updateUserProfile(
				req.user.id,
				updateDto
			)
		} catch {
			throw new HttpException(
				'Failed to update user profile',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Get(':id/exists')
		async checkUserExists(@Param('id') id: string) {
		try {
			const exists = await this.usersService.checkUserExists(id)
			return { exists }
		} catch {
			throw new HttpException(
				'Failed to check user existence',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post('ensure-exists')
	async ensureUserExists(
		@Body() ensureUserDto: EnsureUserExistsDto
	): Promise<UserCreationResult> {
		try {
			return await this.usersService.ensureUserExists(
				ensureUserDto.authUser,
				ensureUserDto.options
			)
		} catch {
			throw new HttpException(
				'Failed to ensure user exists',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post(':id/verify')
	async verifyUserCreation(@Param('id') id: string) {
		try {
			const verified = await this.usersService.verifyUserCreation(id)
			return { verified }
		} catch {
			throw new HttpException(
				'Failed to verify user creation',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post('upload-avatar')
		async uploadAvatar(@Request() req: FastifyRequest & RequestWithUser) {
		try {
			// Handle multipart file upload with Fastify
			const data = await req.file()
			
			if (!data) {
				throw new HttpException(
					'No file uploaded',
					HttpStatus.BAD_REQUEST
				)
			}

			// Validate the uploaded file
			validateAvatarFile(data)

			// Convert multipart file to buffer
			const fileBuffer = await multipartFileToBuffer(data)

			// Upload to storage
			const bucket = this.storageService.getBucket('avatar')
			const storagePath = this.storageService.getStoragePath('user', req.user.id, data.filename)
			
			const uploadResult = await this.storageService.uploadFile(
				bucket,
				storagePath,
				fileBuffer,
				{
					contentType: data.mimetype,
					upsert: true // Allow overwriting existing avatars
				}
			)

			// Update user profile with new avatar URL
			await this.usersService.updateUserProfile(req.user.id, {
				avatarUrl: uploadResult.url
			})

			return {
				url: uploadResult.url,
				path: uploadResult.path,
				filename: uploadResult.filename,
				size: uploadResult.size,
				mimeType: uploadResult.mimeType,
				bucket: uploadResult.bucket
			}
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.BAD_REQUEST
			)
		}
	}
}
