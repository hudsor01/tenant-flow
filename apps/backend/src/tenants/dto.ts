import { IsEmail, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TenantCreateDto {
	@ApiProperty({ description: 'Tenant full name' })
	@IsString()
	name!: string

	@ApiProperty({ description: 'Tenant email address' })
	@IsEmail()
	email!: string

	@ApiPropertyOptional({ description: 'Tenant phone number' })
	@IsOptional()
	@IsString()
	phone?: string

	@ApiPropertyOptional({ description: 'Emergency contact name' })
	@IsOptional()
	@IsString()
	emergencyContact?: string

	@ApiPropertyOptional({ description: 'Emergency contact phone' })
	@IsOptional()
	@IsString()
	emergencyPhone?: string
}

export class TenantUpdateDto {
	@ApiPropertyOptional({ description: 'Tenant full name' })
	@IsOptional()
	@IsString()
	name?: string

	@ApiPropertyOptional({ description: 'Tenant email address' })
	@IsOptional()
	@IsEmail()
	email?: string

	@ApiPropertyOptional({ description: 'Tenant phone number' })
	@IsOptional()
	@IsString()
	phone?: string

	@ApiPropertyOptional({ description: 'Emergency contact name' })
	@IsOptional()
	@IsString()
	emergencyContact?: string

	@ApiPropertyOptional({ description: 'Emergency contact phone' })
	@IsOptional()
	@IsString()
	emergencyPhone?: string
}

export {
	TenantCreateDto as CreateTenantDto,
	TenantUpdateDto as UpdateTenantDto
}
