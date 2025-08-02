import { IsOptional, IsEnum, IsString, IsInt, Min, Max, Matches } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { PropertyType } from '@prisma/client'
import { PROPERTY_TYPE } from '@tenantflow/shared'
import { BaseQueryOptions } from '../../common/services/base-crud.service'

export class PropertyQueryDto implements BaseQueryOptions {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @IsOptional()
  @IsEnum(PropertyType, {
    message: `Property type must be one of: ${Object.values(PROPERTY_TYPE).join(', ')}`
  })
  propertyType?: PropertyType

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z\s\-']+$/, {
    message: 'City must contain only letters, spaces, hyphens, and apostrophes'
  })
  @Transform(({ value }) => value?.trim())
  city?: string

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'State must be a valid 2-letter state code'
  })
  @Transform(({ value }) => value?.toUpperCase())
  state?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset cannot be negative' })
  offset?: number = 0

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'createdAt', 'updatedAt', 'city', 'state'], {
    message: 'Sort by must be one of: name, createdAt, updatedAt, city, state'
  })
  sortBy?: string = 'createdAt'

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be either asc or desc'
  })
  sortOrder?: 'asc' | 'desc' = 'desc';

  // Add index signature to satisfy BaseCrudService interface
  [key: string]: unknown
}