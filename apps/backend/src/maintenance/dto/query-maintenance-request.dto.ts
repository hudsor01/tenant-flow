import { IsOptional, IsEnum, IsString, IsUUID, IsInt, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { Priority, RequestStatus } from '@prisma/client'
import { BaseQueryOptions } from '../../common/services/base-crud.service'

export class MaintenanceRequestQueryDto implements BaseQueryOptions {
  @IsOptional()
  @IsEnum(RequestStatus, { message: 'Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELED, ON_HOLD' })
  status?: RequestStatus

  @IsOptional()
  @IsEnum(Priority, { message: 'Priority must be one of: LOW, MEDIUM, HIGH, EMERGENCY' })
  priority?: Priority

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  category?: string

  @IsOptional()
  @IsUUID(4, { message: 'Unit ID must be a valid UUID' })
  unitId?: string

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

  // Index signature for BaseQueryOptions compatibility
  [key: string]: unknown
}