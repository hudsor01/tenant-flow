import { PartialType } from '@nestjs/mapped-types'
import { CreateDocumentDto } from './create-document.dto'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { 
	DOCUMENT_TYPE_OPTIONS,
	type DocumentType,
	type UpdateDocumentInput 
} from '@repo/shared'
import { Transform } from 'class-transformer'

export class UpdateDocumentDto
	extends PartialType(CreateDocumentDto)
	implements UpdateDocumentInput
{
	@IsString()
	@IsOptional()
	@MaxLength(255, { message: 'Document name cannot exceed 255 characters' })
	@Transform(({ value }) => value?.trim())
	override name?: string

	@IsEnum(DOCUMENT_TYPE_OPTIONS, {
		message:
			'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER'
	})
	@IsOptional()
	override type?: DocumentType
}
