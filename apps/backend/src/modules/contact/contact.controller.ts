import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	SetMetadata
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { ContactFormResponse } from '@repo/shared/types/domain'
import { ContactService } from './contact.service'
import { ContactFormDto } from './dto/contact-form.dto'

@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@Post()
	@SetMetadata('isPublic', true) // Contact forms should be publicly accessible
	@Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 submissions per minute to prevent spam
	@HttpCode(HttpStatus.OK)
	async submitContactForm(
		@Body() dto: ContactFormDto
	): Promise<ContactFormResponse> {
		return this.contactService.processContactForm(dto)
	}
}
