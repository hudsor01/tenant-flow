import {
	Controller,
	Get,
	Post,
	Put,
	Param,
	Body,
	HttpException,
	HttpStatus,
	UseGuards
} from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { AuditLog } from '../common/decorators/audit-log.decorator'
import type { UserCreationResult } from './users.service'
import type { UpdateUserProfileInput, EnsureUserExistsInput } from '@repo/shared'



@Controller('users')
@UseGuards(JwtAuthGuard)

export class UsersController {
	constructor(
		private readonly usersService: UsersService
	) {}

	@Get('me')
	async getCurrentUser(@CurrentUser() user: ValidatedUser) {
		const userProfile = await this.usersService.getUserById(user.id)
		if (!userProfile) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND)
		}
		return userProfile
	}

	@Put('profile')
	@AuditLog({ action: 'UPDATE_USER_PROFILE', entity: 'User', sensitive: false })
	async updateProfile(
		@CurrentUser() user: ValidatedUser,
		@Body() updateDto: UpdateUserProfileInput
	) {
		return await this.usersService.updateUserProfile(
			user.id,
			updateDto
		)
	}

	@Get(':id/exists')
	async checkUserExists(@Param('id') id: string) {
		const exists = await this.usersService.checkUserExists(id)
		return { exists }
	}

	@Post('ensure-exists')
	async ensureUserExists(
		@Body() ensureUserDto: EnsureUserExistsInput
	): Promise<UserCreationResult> {
		return await this.usersService.ensureUserExists(
			ensureUserDto.authUser,
			ensureUserDto.options
		)
	}

	@Post(':id/verify')
	async verifyUserCreation(@Param('id') id: string) {
		const verified = await this.usersService.verifyUserCreation(id)
		return { verified }
	}

}
