import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsEmail } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { BaseQueryOptions } from '../../common/services/base-crud.service'
import { TenantQuery } from '@repo/shared'

export class TenantQueryDto implements BaseQueryOptions, TenantQuery {
  [key: string]: unknown

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  propertyId?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  unitId?: string

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'PENDING', 'TERMINATED'], {
    message: 'Lease status must be one of: ACTIVE, INACTIVE, PENDING, TERMINATED'
  })
  leaseStatus?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  moveInDateFrom?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  moveInDateTo?: string

  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone?: string

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
  @IsEnum(['name', 'email', 'createdAt', 'updatedAt'], {
    message: 'Sort by must be one of: name, email, createdAt, updatedAt'
  })
  sortBy?: string = 'createdAt'

  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be either asc or desc'
  })
  sortOrder?: 'asc' | 'desc' = 'desc'
}