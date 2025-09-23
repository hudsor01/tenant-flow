/**
 * Authentication Boundary DTOs
 *
 * Strategic DTOs for authentication endpoints - external security boundary.
 * Validates untrusted login/registration data from public endpoints.
 */

import {
	IsBoolean,
	IsEmail,
	IsOptional,
	IsString,
	Length,
	Matches
} from 'class-validator'

export class LoginRequestDto {
	@IsEmail()
	@Length(5, 255)
	email!: string

	@IsString()
	@Length(8, 128)
	password!: string

	@IsOptional()
	@IsBoolean()
	rememberMe?: boolean

	@IsOptional()
	@IsString()
	@Length(1, 50)
	captchaToken?: string
}

export class RegisterRequestDto {
	@IsEmail()
	@Length(5, 255)
	email!: string

	@IsString()
	@Length(8, 128)
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
		message:
			'Password must contain uppercase, lowercase, number, and special character'
	})
	password!: string

	@IsString()
	@Length(2, 50)
	firstName!: string

	@IsString()
	@Length(2, 50)
	lastName!: string

	@IsOptional()
	@IsString()
	@Length(1, 100)
	companyName?: string

	@IsOptional()
	@IsString()
	@Length(10, 20)
	phone?: string

	@IsOptional()
	@IsString()
	@Length(1, 50)
	captchaToken?: string

	// Honeypot for spam protection
	@IsOptional()
	@IsString()
	website?: string
}

export class PasswordResetRequestDto {
	@IsEmail()
	@Length(5, 255)
	email!: string

	@IsOptional()
	@IsString()
	@Length(1, 50)
	captchaToken?: string
}

export class PasswordResetConfirmDto {
	@IsString()
	@Length(20, 100)
	token!: string

	@IsString()
	@Length(8, 128)
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
		message:
			'Password must contain uppercase, lowercase, number, and special character'
	})
	newPassword!: string
}
