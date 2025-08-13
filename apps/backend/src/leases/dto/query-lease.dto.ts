import { IsOptional, IsEnum, IsString, IsUUID, IsDateString, IsBoolean, IsInt, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { LeaseStatus } from '@repo/database'
import { BaseQueryDtoWithSort } from '../../common/dto/base-query.dto'
import { LeaseQuery } from '@repo/shared'

type LeaseSortFields = 'startDate' | 'endDate' | 'rentAmount' | 'createdAt' | 'updatedAt'

export class LeaseQueryDto extends BaseQueryDtoWithSort<LeaseSortFields> implements LeaseQuery {
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

  // search field inherited from BaseQueryDto

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1

  // Pagination fields inherited from BaseQueryDto (limit, offset, sortOrder)

  @IsOptional()
  @IsString()
  @IsEnum(['startDate', 'endDate', 'rentAmount', 'createdAt', 'updatedAt'], {
    message: 'Sort by must be one of: startDate, endDate, rentAmount, createdAt, updatedAt'
  })
  sortBy?: LeaseSortFields = 'createdAt'
}