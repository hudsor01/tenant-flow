import {
	BadRequestException,
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	SetMetadata
} from '@nestjs/common'
import type { ContactFormRequest, ContactFormResponse } from '@repo/shared'
import { ContactService } from './contact.service'

// @ApiTags('contact')
@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@Post()
	@SetMetadata('isPublic', true) // Contact forms should be publicly accessible
	@HttpCode(HttpStatus.OK)
	async submitContactForm(
		@Body() dto: ContactFormRequest
	): Promise<ContactFormResponse> {
		// Manual validation for contact form data
		if (!dto || typeof dto !== 'object') {
			throw new BadRequestException('Invalid contact form data')
		}

		if (
			!dto.name ||
			typeof dto.name !== 'string' ||
			dto.name.trim().length === 0 ||
			dto.name.length > 100
		) {
			throw new BadRequestException(
				'Name is required and must be 1-100 characters'
			)
		}

		if (
			!dto.email ||
			typeof dto.email !== 'string' ||
			!dto.email.includes('@')
		) {
			throw new BadRequestException('Valid email address is required')
		}

		if (
			!dto.subject ||
			typeof dto.subject !== 'string' ||
			dto.subject.trim().length === 0 ||
			dto.subject.length > 200
		) {
			throw new BadRequestException(
				'Subject is required and must be 1-200 characters'
			)
		}

		if (
			!dto.message ||
			typeof dto.message !== 'string' ||
			dto.message.trim().length < 10 ||
			dto.message.length > 5000
		) {
			throw new BadRequestException(
				'Message is required and must be 10-5000 characters'
			)
		}

		const validTypes = ['sales', 'support', 'general']
		if (!dto.type || !validTypes.includes(dto.type)) {
			throw new BadRequestException(
				'Type must be one of: sales, support, general'
			)
		}
		return this.contactService.processContactForm(dto)
	}
}
