import {
	Controller,
	Get,
	Post,
	Put,
	Param,
	Body,
	UseGuards,
	Request,
	HttpException,
	HttpStatus,
	UseInterceptors,
	UploadedFile
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { RequestWithUser } from '../auth/auth.types'
import { UsersService } from './users.service'
import type { UserCreationResult } from './users.service'

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
	constructor(private readonly usersService: UsersService) {}

	@Get('me')
	@UseGuards(JwtAuthGuard)
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
	@UseGuards(JwtAuthGuard)
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
	@UseGuards(JwtAuthGuard)
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
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './uploads/avatars',
				filename: (req, file, cb) => {
					const uniqueSuffix =
						Date.now() + '-' + Math.round(Math.random() * 1e9)
					cb(
						null,
						`avatar-${uniqueSuffix}${extname(file.originalname)}`
					)
				}
			}),
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
					return cb(new Error('Only image files are allowed!'), false)
				}
				cb(null, true)
			},
			limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
		})
	)
	async uploadAvatar(
		@UploadedFile() file: Express.Multer.File,
		@Request() req: RequestWithUser
	) {
		try {
			if (!file) {
				throw new HttpException(
					'No file uploaded',
					HttpStatus.BAD_REQUEST
				)
			}

			const avatarUrl = `/uploads/avatars/${file.filename}`

			// Update user profile with new avatar URL
			await this.usersService.updateUserProfile(req.user.id, {
				avatarUrl
			})

			return {
				url: avatarUrl,
				path: file.path,
				filename: file.filename,
				size: file.size,
				mimeType: file.mimetype
			}
		} catch {
			throw new HttpException(
				'Failed to upload avatar',
				HttpStatus.BAD_REQUEST
			)
		}
	}
}
