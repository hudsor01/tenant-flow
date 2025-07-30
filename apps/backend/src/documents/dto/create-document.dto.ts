import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
  IsInt,
  Min,
  Max
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { DocumentType } from '@prisma/client'

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'Document name is required' })
  @MinLength(1, { message: 'Document name must be at least 1 character' })
  @MaxLength(255, { message: 'Document name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Filename cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  filename?: string

  @IsUrl({}, { message: 'URL must be a valid URL' })
  @IsNotEmpty({ message: 'Document URL is required' })
  @MaxLength(2048, { message: 'URL cannot exceed 2048 characters' })
  url!: string

  @IsEnum(DocumentType, { 
    message: 'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER' 
  })
  type!: DocumentType

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9/\-+.]+$/, { 
    message: 'MIME type must be a valid format (e.g., application/pdf, image/jpeg)' 
  })
  @MaxLength(100, { message: 'MIME type cannot exceed 100 characters' })
  mimeType?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'File size must be an integer' })
  @Min(0, { message: 'File size cannot be negative' })
  @Max(104857600, { message: 'File size cannot exceed 100MB' }) // 100MB limit
  fileSizeBytes?: number

  @IsUUID(4, { message: 'Property ID must be a valid UUID' })
  @IsOptional()
  propertyId?: string

  @IsUUID(4, { message: 'Lease ID must be a valid UUID' })
  @IsOptional()
  leaseId?: string
}