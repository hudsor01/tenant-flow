import { PartialType } from '@nestjs/mapped-types'
import { CreateDocumentDto } from './create-document.dto'
import { IsOptional, IsEnum, IsString, MaxLength } from 'class-validator'
import { DocumentType } from '@prisma/client'
import { Transform } from 'class-transformer'

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Document name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  override name?: string

  @IsEnum(DocumentType, { 
    message: 'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER' 
  })
  @IsOptional()
  override type?: DocumentType
}