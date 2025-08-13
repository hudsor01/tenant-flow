import { IsOptional, IsEnum, IsString, Matches } from 'class-validator'
import { Transform } from 'class-transformer'
import { PropertyType } from '@repo/database'
import { PROPERTY_TYPE, PropertyQueryInput } from '@repo/shared'
import { BaseQueryDtoWithSort } from '../../common/dto/base-query.dto'

type PropertySortFields = 'name' | 'createdAt' | 'updatedAt' | 'city' | 'state'

export class PropertyQueryDto extends BaseQueryDtoWithSort<PropertySortFields> implements PropertyQueryInput {
  // search field inherited from BaseQueryDto

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
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'ZIP code must be in format 12345 or 12345-6789'
  })
  @Transform(({ value }) => value?.trim())
  zipCode?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  status?: string

  @IsOptional()
  @IsString()
  ownerId?: string

  // Pagination fields inherited from BaseQueryDto

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'createdAt', 'updatedAt', 'city', 'state'], {
    message: 'Sort by must be one of: name, createdAt, updatedAt, city, state'
  })
  sortBy?: PropertySortFields = 'createdAt'

  // Index signature inherited from BaseQueryDto
}