import { IsOptional, IsString, IsNumber, IsPositive, IsEnum, Min, Max, IsDateString, IsArray } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { UnitStatus } from '@repo/database'
import { UpdateUnitInput } from '@repo/shared'

export class UnitUpdateDto implements Omit<UpdateUnitInput, 'id'> {
  @IsOptional()
  @IsString({ message: 'Unit number must be a string' })
  @Transform(({ value }) => value?.trim())
  unitNumber?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bedrooms must be a number' })
  @Min(0, { message: 'Bedrooms cannot be negative' })
  @Max(20, { message: 'Bedrooms cannot exceed 20' })
  bedrooms?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bathrooms must be a number' })
  @Min(0, { message: 'Bathrooms cannot be negative' })
  @Max(20, { message: 'Bathrooms cannot exceed 20' })
  bathrooms?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Square feet must be a number' })
  @Min(1, { message: 'Square feet must be positive' })
  @Max(50000, { message: 'Square feet cannot exceed 50,000' })
  squareFeet?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Monthly rent must be a number' })
  @IsPositive({ message: 'Monthly rent must be positive' })
  @Max(100000, { message: 'Monthly rent cannot exceed $100,000' })
  monthlyRent?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Security deposit must be a number' })
  @Min(0, { message: 'Security deposit cannot be negative' })
  @Max(100000, { message: 'Security deposit cannot exceed $100,000' })
  securityDeposit?: number

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => value?.trim())
  description?: string

  @IsOptional()
  @IsArray({ message: 'Amenities must be an array' })
  @IsString({ each: true, message: 'Each amenity must be a string' })
  amenities?: string[]

  @IsOptional()
  @IsEnum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'], {
    message: 'Status must be one of: VACANT, OCCUPIED, MAINTENANCE, UNAVAILABLE'
  })
  status?: UnitStatus

  @IsOptional()
  @IsDateString({}, { message: 'Last inspection date must be a valid date' })
  lastInspectionDate?: string
}