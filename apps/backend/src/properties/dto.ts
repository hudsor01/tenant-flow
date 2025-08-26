import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreatePropertyDto {
	@ApiProperty({ description: 'Property name' })
	@IsString()
	name!: string

	@ApiProperty({ description: 'Property address' })
	@IsString()
	address!: string

	@ApiProperty({ description: 'City' })
	@IsString()
	city!: string

	@ApiProperty({ description: 'State' })
	@IsString()
	state!: string

	@ApiProperty({ description: 'ZIP code' })
	@IsString()
	zipCode!: string

	@ApiPropertyOptional({ description: 'Property description' })
	@IsOptional()
	@IsString()
	description?: string

	@ApiPropertyOptional({ description: 'Property image URL' })
	@IsOptional()
	@IsString()
	imageUrl?: string

	@ApiPropertyOptional({
		description: 'Property type',
		enum: ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL'],
		default: 'SINGLE_FAMILY'
	})
	@IsOptional()
	@IsString()
	propertyType?: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'

	@ApiPropertyOptional({
		description: 'Unit number for multi-unit properties'
	})
	@IsOptional()
	@IsString()
	unit_number?: string

	@ApiProperty({ description: 'Total number of units', default: 1 })
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	total_units!: number

	@ApiPropertyOptional({
		description: 'Number of units to create',
		default: 1
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	units?: number

	@ApiProperty({ description: 'Number of bedrooms' })
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	bedrooms!: number

	@ApiProperty({ description: 'Number of bathrooms' })
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	bathrooms!: number

	@ApiPropertyOptional({ description: 'Square footage' })
	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	square_footage?: number

	@ApiPropertyOptional({ description: 'Has pool amenity', default: false })
	@IsOptional()
	has_pool?: boolean
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}

export class PropertyQueryDto {
	@ApiPropertyOptional({ description: 'Search query' })
	@IsOptional()
	@IsString()
	search?: string

	@ApiPropertyOptional({ description: 'Limit results', default: 10 })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Type(() => Number)
	limit?: number

	@ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	offset?: number
}
