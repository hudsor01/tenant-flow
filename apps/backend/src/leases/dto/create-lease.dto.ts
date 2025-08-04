import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsPositive
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { LeaseStatus } from '@repo/database'

export class CreateLeaseDto {
  @IsUUID(4, { message: 'Unit ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Unit ID is required' })
  unitId!: string

  @IsUUID(4, { message: 'Tenant ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Tenant ID is required' })
  tenantId!: string

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

  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Lease terms must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Lease terms cannot exceed 5000 characters' })
  @Transform(({ value }) => value?.trim())
  terms?: string

  @IsEnum(LeaseStatus, { message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED' })
  @IsOptional()
  status?: LeaseStatus = LeaseStatus.DRAFT
}