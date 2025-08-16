import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { BaseQueryDtoWithSort } from '../../common/dto/base-query.dto'
import { TenantQuery } from '@repo/shared'

type TenantSortFields = 'name' | 'email' | 'createdAt' | 'updatedAt'

export class TenantQueryDto extends BaseQueryDtoWithSort<TenantSortFields> implements TenantQuery {

  // search field inherited from BaseQueryDto

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

  // Pagination fields inherited from BaseQueryDto

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'email', 'createdAt', 'updatedAt'], {
    message: 'Sort by must be one of: name, email, createdAt, updatedAt'
  })
  sortBy?: TenantSortFields = 'createdAt'
}