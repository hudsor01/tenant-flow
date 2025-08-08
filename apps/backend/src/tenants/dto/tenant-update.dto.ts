import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { TenantCreateDto } from './tenant-create.dto'

export class TenantUpdateDto extends PartialType(TenantCreateDto) {
  // Only add fields that are unique to updates
  @IsOptional()
  @IsString({ message: 'Move out date must be a string' })
  @Transform(({ value }) => value?.trim())
  moveOutDate?: string
}