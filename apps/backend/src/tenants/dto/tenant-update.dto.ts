import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { UpdateTenantInput } from '@repo/shared'
import { TenantCreateDto } from './tenant-create.dto'

export class TenantUpdateDto extends PartialType(TenantCreateDto) implements Omit<UpdateTenantInput, 'id'> {
  // Only add fields that are unique to updates
  @IsOptional()
  @IsString({ message: 'Move out date must be a string' })
  @Transform(({ value }) => value?.trim())
  moveOutDate?: string
}