import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsUUID, IsNumber } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { UnitStatus } from '@repo/database'
import { BaseQueryOptions } from '../../common/services/base-crud.service'
import { UnitQuery } from '@repo/shared'

export class UnitQueryDto implements BaseQueryOptions, UnitQuery {
  [key: string]: unknown

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @IsOptional()
  @IsUUID(4, { message: 'Property ID must be a valid UUID' })
  propertyId?: string

  @IsOptional()
  @IsEnum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'], {
    message: 'Status must be one of: VACANT, OCCUPIED, MAINTENANCE, UNAVAILABLE'
  })
  status?: UnitStatus

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  type?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bedrooms min must be a number' })
  @Min(0, { message: 'Bedrooms min cannot be negative' })
  bedroomsMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bedrooms max must be a number' })
  @Min(0, { message: 'Bedrooms max cannot be negative' })
  bedroomsMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bathrooms min must be a number' })
  @Min(0, { message: 'Bathrooms min cannot be negative' })
  bathroomsMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bathrooms max must be a number' })
  @Min(0, { message: 'Bathrooms max cannot be negative' })
  bathroomsMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Rent min must be a number' })
  @Min(0, { message: 'Rent min cannot be negative' })
  rentMin?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Rent max must be a number' })
  @Min(0, { message: 'Rent max cannot be negative' })
  rentMax?: number

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
  @IsEnum(['unitNumber', 'rent', 'status', 'createdAt', 'updatedAt'], {
    message: 'Sort by must be one of: unitNumber, rent, status, createdAt, updatedAt'
  })
  sortBy?: string = 'unitNumber'

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be either asc or desc'
  })
  sortOrder?: 'asc' | 'desc' = 'asc'
}