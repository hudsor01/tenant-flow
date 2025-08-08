import { PartialType } from '@nestjs/mapped-types'
import type { UpdatePropertyInput } from '@repo/shared'
import { CreatePropertyDto } from './create-property.dto'

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) implements Omit<UpdatePropertyInput, 'id'> {
  [key: string]: unknown
}