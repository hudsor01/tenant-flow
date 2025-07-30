import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsPhoneNumber,
  IsArray,
  MinLength,
  MaxLength,
  IsDateString
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { Priority, RequestStatus } from '@prisma/client'

export class CreateMaintenanceRequestDto {
  @IsUUID(4, { message: 'Unit ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Unit ID is required' })
  unitId!: string

  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  title!: string

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  description!: string

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Category cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  category?: string

  @IsEnum(Priority, { message: 'Priority must be one of: LOW, MEDIUM, HIGH, EMERGENCY' })
  @IsOptional()
  priority?: Priority = Priority.MEDIUM

  @IsEnum(RequestStatus, { message: 'Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELED, ON_HOLD' })
  @IsOptional()
  status?: RequestStatus = RequestStatus.OPEN

  @IsDateString({}, { message: 'Preferred date must be a valid ISO date string' })
  @IsOptional()
  preferredDate?: string

  @IsBoolean({ message: 'Allow entry must be a boolean value' })
  @IsOptional()
  @Type(() => Boolean)
  allowEntry?: boolean = true

  @IsString()
  @IsPhoneNumber('US', { message: 'Contact phone must be a valid US phone number' })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  contactPhone?: string

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Requested by cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  requestedBy?: string

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Notes cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string

  @IsArray({ message: 'Photos must be an array of strings' })
  @IsString({ each: true, message: 'Each photo must be a valid string URL' })
  @IsOptional()
  photos?: string[] = []
}