import { IsNumber, IsOptional, IsString, IsEnum, IsBoolean, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

/**
 * Unit status enumeration for validation
 */
export enum UnitStatus {
	VACANT = 'VACANT',
	OCCUPIED = 'OCCUPIED',
	MAINTENANCE = 'MAINTENANCE',
	RESERVED = 'RESERVED'
}

/**
 * DTO for creating a new unit
 */
export class CreateUnitDto {
	@ApiProperty({ 
		description: 'Property ID that this unit belongs to',
		format: 'uuid' 
	})
	@IsString()
	propertyId!: string

	@ApiProperty({ 
		description: 'Unit number or identifier (e.g., "1A", "Main House", "Apt 2")',
		example: '1A' 
	})
	@IsString()
	unitNumber!: string

	@ApiProperty({ 
		description: 'Number of bedrooms',
		minimum: 0,
		maximum: 20 
	})
	@IsNumber()
	@Min(0)
	@Max(20)
	@Type(() => Number)
	bedrooms!: number

	@ApiProperty({ 
		description: 'Number of bathrooms',
		minimum: 0,
		maximum: 10 
	})
	@IsNumber()
	@Min(0)
	@Max(10)
	@Type(() => Number)
	bathrooms!: number

	@ApiPropertyOptional({ 
		description: 'Square footage of the unit',
		minimum: 1,
		maximum: 50000 
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(50000)
	@Type(() => Number)
	squareFeet?: number

	@ApiProperty({ 
		description: 'Monthly rent amount in dollars',
		minimum: 0,
		maximum: 100000,
		default: 0
	})
	@IsNumber()
	@Min(0)
	@Max(100000)
	@Type(() => Number)
	rent!: number

	@ApiPropertyOptional({
		description: 'Unit status',
		enum: UnitStatus,
		default: UnitStatus.VACANT
	})
	@IsOptional()
	@IsEnum(UnitStatus)
	status?: UnitStatus
}

/**
 * DTO for updating an existing unit
 */
export class UpdateUnitDto {
	@ApiPropertyOptional({ 
		description: 'Unit number or identifier',
		example: '1A' 
	})
	@IsOptional()
	@IsString()
	unitNumber?: string

	@ApiPropertyOptional({ 
		description: 'Number of bedrooms',
		minimum: 0,
		maximum: 20 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(20)
	@Type(() => Number)
	bedrooms?: number

	@ApiPropertyOptional({ 
		description: 'Number of bathrooms',
		minimum: 0,
		maximum: 10 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(10)
	@Type(() => Number)
	bathrooms?: number

	@ApiPropertyOptional({ 
		description: 'Square footage of the unit',
		minimum: 1,
		maximum: 50000 
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(50000)
	@Type(() => Number)
	squareFeet?: number

	@ApiPropertyOptional({ 
		description: 'Monthly rent amount in dollars',
		minimum: 0,
		maximum: 100000 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100000)
	@Type(() => Number)
	rent?: number

	@ApiPropertyOptional({
		description: 'Unit status',
		enum: UnitStatus
	})
	@IsOptional()
	@IsEnum(UnitStatus)
	status?: UnitStatus
}

/**
 * DTO for querying units with filters and pagination
 */
export class UnitQueryDto {
	@ApiPropertyOptional({ 
		description: 'Filter by property ID',
		format: 'uuid' 
	})
	@IsOptional()
	@IsString()
	propertyId?: string

	@ApiPropertyOptional({
		description: 'Filter by unit status',
		enum: UnitStatus
	})
	@IsOptional()
	@IsEnum(UnitStatus)
	status?: UnitStatus

	@ApiPropertyOptional({ 
		description: 'Search by unit number or description' 
	})
	@IsOptional()
	@IsString()
	search?: string

	@ApiPropertyOptional({ 
		description: 'Minimum number of bedrooms',
		minimum: 0,
		maximum: 20 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(20)
	@Type(() => Number)
	bedroomsMin?: number

	@ApiPropertyOptional({ 
		description: 'Maximum number of bedrooms',
		minimum: 0,
		maximum: 20 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(20)
	@Type(() => Number)
	bedroomsMax?: number

	@ApiPropertyOptional({ 
		description: 'Minimum rent amount',
		minimum: 0,
		maximum: 100000 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100000)
	@Type(() => Number)
	rentMin?: number

	@ApiPropertyOptional({ 
		description: 'Maximum rent amount',
		minimum: 0,
		maximum: 100000 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100000)
	@Type(() => Number)
	rentMax?: number

	@ApiPropertyOptional({ 
		description: 'Maximum number of results',
		minimum: 1,
		maximum: 50,
		default: 10 
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(50) // PRODUCTION: Reduced from 100 to prevent memory issues
	@Type(() => Number)
	limit?: number

	@ApiPropertyOptional({ 
		description: 'Number of results to skip for pagination',
		minimum: 0,
		default: 0 
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	offset?: number

	@ApiPropertyOptional({
		description: 'Field to sort by',
		enum: ['createdAt', 'unitNumber', 'bedrooms', 'rent', 'status'],
		default: 'createdAt'
	})
	@IsOptional()
	@IsString()
	sortBy?: 'createdAt' | 'unitNumber' | 'bedrooms' | 'rent' | 'status'

	@ApiPropertyOptional({
		description: 'Sort order',
		enum: ['asc', 'desc'],
		default: 'desc'
	})
	@IsOptional()
	@IsEnum(['asc', 'desc'])
	sortOrder?: 'asc' | 'desc'
}

/**
 * DTO for updating unit availability
 */
export class UpdateUnitAvailabilityDto {
	@ApiProperty({ 
		description: 'Whether the unit is available for rent' 
	})
	@IsBoolean()
	available!: boolean
}