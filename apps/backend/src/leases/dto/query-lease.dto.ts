import { IsOptional, IsEnum, IsString, IsUUID, IsInt, Min, Max, IsDateString, IsBoolean } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { LeaseStatus } from '@repo/database'
import { BaseQueryOptions } from '../../common/services/base-crud.service'
import { LeaseQuery } from '@repo/shared'

export class LeaseQueryDto implements BaseQueryOptions, LeaseQuery {
  @IsOptional()
  @IsEnum(LeaseStatus, { message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED' })
  status?: LeaseStatus

  @IsOptional()
  @IsUUID(4, { message: 'Unit ID must be a valid UUID' })
  unitId?: string

  @IsOptional()
  @IsUUID(4, { message: 'Tenant ID must be a valid UUID' })
  tenantId?: string

  @IsOptional()
  @IsUUID(4, { message: 'Property ID must be a valid UUID' })
  propertyId?: string

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean({ message: 'Include expired must be a boolean' })
  includeExpired?: boolean

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number

  @IsOptional()
  @IsString()
  sortBy?: string

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc'

  // Add index signature to satisfy BaseCrudService interface
  [key: string]: unknown
}