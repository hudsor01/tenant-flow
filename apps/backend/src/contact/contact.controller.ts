import {
	Body,
	Controller,
	Post,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
// Swagger imports removed
import type { ContactFormRequest } from '@repo/shared'
import type { ContactFormResponse } from '../schemas/contact.schemas'
import { ContactService } from './contact.service'

// @ApiTags('contact')
@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@Post()
	// @ApiOperation({ summary: 'Submit contact form' })
	// @ApiResponse({ status: 200, description: 'Contact form submitted successfully' })
	@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
	async submitContactForm(
		@Body() dto: ContactFormRequest
	): Promise<ContactFormResponse> {
		return this.contactService.processContactForm(dto)
	}
}
