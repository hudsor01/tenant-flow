import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsUUID } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { UnitStatus } from '@repo/database'
import { BaseQueryOptions } from '../../common/services/base-crud.service'

export class UnitQueryDto implements BaseQueryOptions {
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