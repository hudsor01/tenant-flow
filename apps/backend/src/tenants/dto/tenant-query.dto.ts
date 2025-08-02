import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { BaseQueryOptions } from '../../common/services/base-crud.service'

export class TenantQueryDto implements BaseQueryOptions {
  [key: string]: unknown

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'PENDING', 'TERMINATED'], {
    message: 'Status must be one of: ACTIVE, INACTIVE, PENDING, TERMINATED'
  })
  status?: string

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