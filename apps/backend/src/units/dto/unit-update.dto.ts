import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsDateString } from 'class-validator'
import { UnitCreateDto } from './unit-create.dto'

export class UnitUpdateDto extends PartialType(UnitCreateDto) {
  // Only add fields that are unique to updates
  @IsOptional()
  @IsDateString({}, { message: 'Last inspection date must be a valid date' })
  lastInspectionDate?: string
}