/**
 * Public API DTOs - Contact Form
 *
 * Strategic DTO for public-facing contact form endpoint.
 * Provides validation for untrusted external input.
 */

import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator'
import { ContactFormType } from '@repo/shared'

export class ContactFormSubmissionDto {
	@IsString()
	@Length(1, 100)
	name!: string

	@IsEmail()
	@Length(5, 255)
	email!: string

	@IsOptional()
	@IsString()
	@Length(1, 50)
	company?: string

	@IsOptional()
	@IsString()
	@Length(10, 20)
	phone?: string

	@IsEnum(ContactFormType)
	type!: ContactFormType

	@IsString()
	@Length(10, 2000)
	message!: string

	@IsOptional()
	@IsString()
	@Length(1, 100)
	source?: string // Tracking parameter

	// Honeypot field for spam protection
	@IsOptional()
	@IsString()
	website?: string
}
