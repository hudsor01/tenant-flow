import { PartialType } from '@nestjs/mapped-types'
import { CreateLeaseDto } from './create-lease.dto'
import { IsOptional, IsEnum, IsDateString } from 'class-validator'
import { LeaseStatus } from '@prisma/client'

export class UpdateLeaseDto extends PartialType(CreateLeaseDto) {
  @IsEnum(LeaseStatus, { message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED' })
  @IsOptional()
  override status?: LeaseStatus

  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  @IsOptional()
  override startDate?: string

  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  @IsOptional()
  override endDate?: string
}