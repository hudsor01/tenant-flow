import { IsOptional, IsEnum, IsString, IsUUID, IsInt, Min, Max, IsDateString } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { DocumentType } from '@repo/database'

export class DocumentQueryDto {
  @IsOptional()
  @IsEnum(DocumentType, { 
    message: 'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER' 
  })
  type?: DocumentType

  @IsOptional()
  @IsUUID(4, { message: 'Property ID must be a valid UUID' })
  propertyId?: string

  @IsOptional()
  @IsUUID(4, { message: 'Lease ID must be a valid UUID' })
  leaseId?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  mimeType?: string

  @IsOptional()
  @IsDateString({}, { message: 'Created from date must be a valid ISO date string' })
  createdFrom?: string

  @IsOptional()
  @IsDateString({}, { message: 'Created to date must be a valid ISO date string' })
  createdTo?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Min file size must be an integer' })
  @Min(0, { message: 'Min file size cannot be negative' })
  minFileSize?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Max file size must be an integer' })
  @Min(0, { message: 'Max file size cannot be negative' })
  maxFileSize?: number

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number

  // REQUIRED: Index signature for BaseCrudService compatibility
  [key: string]: unknown
}