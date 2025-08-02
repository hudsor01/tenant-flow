import { IsNotEmpty, IsOptional, IsString, IsNumber, IsPositive, IsEnum, IsUUID, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { UnitStatus } from '@prisma/client'

export class UnitCreateDto {
  @IsNotEmpty({ message: 'Unit number is required' })
  @IsString({ message: 'Unit number must be a string' })
  @Transform(({ value }) => value?.trim())
  unitNumber!: string

  @IsNotEmpty({ message: 'Property ID is required' })
  @IsUUID(4, { message: 'Property ID must be a valid UUID' })
  propertyId!: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bedrooms must be a number' })
  @Min(0, { message: 'Bedrooms cannot be negative' })
  @Max(20, { message: 'Bedrooms cannot exceed 20' })
  bedrooms?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bathrooms must be a number' })
  @Min(0, { message: 'Bathrooms cannot be negative' })
  @Max(20, { message: 'Bathrooms cannot exceed 20' })
  bathrooms?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Square feet must be a number' })
  @Min(1, { message: 'Square feet must be positive' })
  @Max(50000, { message: 'Square feet cannot exceed 50,000' })
  squareFeet?: number

  @IsNotEmpty({ message: 'Rent is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Rent must be a number' })
  @IsPositive({ message: 'Rent must be positive' })
  @Max(100000, { message: 'Rent cannot exceed $100,000' })
  rent!: number

  @IsOptional()
  @IsEnum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'], {
    message: 'Status must be one of: VACANT, OCCUPIED, MAINTENANCE, UNAVAILABLE'
  })
  status?: UnitStatus = 'VACANT'
}