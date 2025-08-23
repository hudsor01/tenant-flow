import {
	IsBoolean,
	IsEmail,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength
} from 'class-validator'
import {
	COMPANY_VALIDATION,
	EMAIL_VALIDATION,
	NAME_VALIDATION,
	PASSWORD_VALIDATION
} from '../../shared/constants/validation.constants'

export class LoginDto {
	@IsEmail({}, { message: EMAIL_VALIDATION.MESSAGE })
	declare email: string

	@IsString()
	@MinLength(PASSWORD_VALIDATION.MIN_LENGTH, { message: PASSWORD_VALIDATION.MESSAGES.MIN_LENGTH })
	declare password: string

	@IsOptional()
	@IsBoolean()
	declare rememberMe?: boolean
}

export class RegisterDto {
	@IsString()
	@MinLength(NAME_VALIDATION.MIN_LENGTH, { message: NAME_VALIDATION.MESSAGES.MIN_LENGTH })
	@MaxLength(NAME_VALIDATION.MAX_LENGTH, { message: NAME_VALIDATION.MESSAGES.MAX_LENGTH })
	declare name: string

	@IsEmail({}, { message: EMAIL_VALIDATION.MESSAGE })
	declare email: string

	@IsString()
	@MinLength(PASSWORD_VALIDATION.MIN_LENGTH, { message: PASSWORD_VALIDATION.MESSAGES.MIN_LENGTH })
	@Matches(PASSWORD_VALIDATION.REGEX, {
		message: PASSWORD_VALIDATION.MESSAGES.COMPLEXITY
	})
	declare password: string

	@IsOptional()
	@IsString()
	@MaxLength(COMPANY_VALIDATION.MAX_LENGTH, { message: COMPANY_VALIDATION.MESSAGE })
	declare company?: string

	@IsOptional()
	@IsBoolean()
	declare acceptTerms?: boolean
}

export class RefreshTokenDto {
	@IsString()
	declare refresh_token: string
}

export class ForgotPasswordDto {
	@IsEmail({}, { message: EMAIL_VALIDATION.MESSAGE })
	declare email: string
}

export class ResetPasswordDto {
	@IsString()
	declare token: string

	@IsString()
	@MinLength(PASSWORD_VALIDATION.MIN_LENGTH, { message: PASSWORD_VALIDATION.MESSAGES.MIN_LENGTH })
	@Matches(PASSWORD_VALIDATION.REGEX, {
		message: PASSWORD_VALIDATION.MESSAGES.COMPLEXITY
	})
	declare newPassword: string

	@IsString()
	declare confirmPassword: string
}

export class ChangePasswordDto {
	@IsString()
	declare currentPassword: string

	@IsString()
	@MinLength(PASSWORD_VALIDATION.MIN_LENGTH, { message: PASSWORD_VALIDATION.MESSAGES.MIN_LENGTH })
	@Matches(PASSWORD_VALIDATION.REGEX, {
		message: PASSWORD_VALIDATION.MESSAGES.COMPLEXITY
	})
	declare newPassword: string

	@IsString()
	declare confirmPassword: string
}