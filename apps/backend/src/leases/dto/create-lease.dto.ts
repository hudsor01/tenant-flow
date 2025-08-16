import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { LeaseStatus } from '@repo/database'
import { CreateLeaseInput } from '@repo/shared'

export class CreateLeaseDto implements CreateLeaseInput {
  @IsUUID(4, { message: 'Unit ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Unit ID is required' })
  unitId!: string

  @IsUUID(4, { message: 'Tenant ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Tenant ID is required' })
  tenantId!: string

  @IsOptional()
  @IsUUID(4, { message: 'Property ID must be a valid UUID' })
  propertyId?: string

  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'Start date is required' })
  startDate!: string

  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  @IsNotEmpty({ message: 'End date is required' })
  endDate!: string

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Rent amount must be a number with at most 2 decimal places' })
  @IsPositive({ message: 'Rent amount must be positive' })
  @Min(1, { message: 'Rent amount must be at least $1' })
  @Max(100000, { message: 'Rent amount cannot exceed $100,000' })
  @Type(() => Number)
  rentAmount!: number

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Security deposit must be a number with at most 2 decimal places' })
  @Min(0, { message: 'Security deposit cannot be negative' })
  @Max(100000, { message: 'Security deposit cannot exceed $100,000' })
  @Type(() => Number)
  securityDeposit!: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Late fee days must be a number' })
  @Min(0, { message: 'Late fee days cannot be negative' })
  @Max(365, { message: 'Late fee days cannot exceed 365' })
  lateFeeDays?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Late fee amount must be a number' })
  @Min(0, { message: 'Late fee amount cannot be negative' })
  @Max(10000, { message: 'Late fee amount cannot exceed $10,000' })
  lateFeeAmount?: number

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Lease terms must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Lease terms cannot exceed 5000 characters' })
  @Transform(({ value }) => value?.trim())
  leaseTerms?: string

  @IsEnum(LeaseStatus, { message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED' })
  @IsOptional()
  status?: LeaseStatus = LeaseStatus.DRAFT
}