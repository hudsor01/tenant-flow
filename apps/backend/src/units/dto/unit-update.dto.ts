import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsDateString } from 'class-validator'
import { UpdateUnitInput } from '@repo/shared'
import { UnitCreateDto } from './unit-create.dto'

export class UnitUpdateDto extends PartialType(UnitCreateDto) implements Omit<UpdateUnitInput, 'id'> {
  // Only add fields that are unique to updates
  @IsOptional()
  @IsDateString({}, { message: 'Last inspection date must be a valid date' })
  lastInspectionDate?: string
}