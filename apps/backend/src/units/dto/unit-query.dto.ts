import { IsOptional, IsString, IsEnum, IsUUID, IsNumber, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { UnitStatus } from '@repo/database'
import { BaseQueryDtoWithSort } from '../../common/dto/base-query.dto'
import { UnitQuery } from '@repo/shared'

type UnitSortFields = 'unitNumber' | 'rent' | 'status' | 'createdAt' | 'updatedAt'

export class UnitQueryDto extends BaseQueryDtoWithSort<UnitSortFields> implements UnitQuery {

  // search field inherited from BaseQueryDto

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

  // Pagination fields inherited from BaseQueryDto

  @IsOptional()
  @IsString()
  @IsEnum(['unitNumber', 'rent', 'status', 'createdAt', 'updatedAt'], {
    message: 'Sort by must be one of: unitNumber, rent, status, createdAt, updatedAt'
  })
  sortBy?: UnitSortFields = 'unitNumber'
}