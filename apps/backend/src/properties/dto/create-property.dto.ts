import { IsString, IsEnum, IsOptional, MinLength, MaxLength, Matches, IsUrl, IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'
import { PropertyType } from '@repo/database'
import { PROPERTY_TYPE, CreatePropertyInput } from '@repo/shared'

export class CreatePropertyDto implements CreatePropertyInput {
  @IsString()
  @IsNotEmpty({ message: 'Property name is required' })
  @MinLength(3, { message: 'Property name must be at least 3 characters' })
  @MaxLength(100, { message: 'Property name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  @MaxLength(200, { message: 'Address cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  address!: string

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MinLength(2, { message: 'City must be at least 2 characters' })
  @MaxLength(50, { message: 'City cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  city!: string

  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  @Matches(/^[A-Z]{2}$/, { message: 'State must be a valid 2-letter code (e.g., CA, NY)' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  state!: string

  @IsString()
  @IsNotEmpty({ message: 'ZIP code is required' })
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'ZIP code must be in format 12345 or 12345-6789' })
  @Transform(({ value }) => value?.trim())
  zipCode!: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string

  @IsOptional()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  @MaxLength(500, { message: 'Image URL cannot exceed 500 characters' })
  imageUrl?: string

  @IsEnum(PROPERTY_TYPE, { 
    message: `Property type must be one of: ${Object.values(PROPERTY_TYPE).join(', ')}` 
  })
  @Transform(({ value }) => value || PROPERTY_TYPE.SINGLE_FAMILY)
  propertyType!: PropertyType
}