import {
	IsDateString,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Min
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { 
	DOCUMENT_TYPE_OPTIONS,
	type DocumentType
} from '@repo/shared'
import { BaseQueryDto } from '../../common/dto/base-query.dto'

export class DocumentQueryDto extends BaseQueryDto {
	@IsOptional()
	@IsEnum(DOCUMENT_TYPE_OPTIONS, {
		message:
			'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER'
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
	@IsDateString(
		{},
		{ message: 'Created from date must be a valid ISO date string' }
	)
	createdFrom?: string

	@IsOptional()
	@IsDateString(
		{},
		{ message: 'Created to date must be a valid ISO date string' }
	)
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
	@IsEnum(['name', 'type', 'createdAt', 'fileSize'])
	sortBy?: 'name' | 'type' | 'createdAt' | 'fileSize'
}
