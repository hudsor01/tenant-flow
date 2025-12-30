import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	SetMetadata
} from '@nestjs/common'
import {
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type {
	ContactFormResponse,
	ContactFormRequest
} from '@repo/shared/types/domain'
import { ContactService } from './contact.service'
import { ContactFormDto } from './dto/contact-form.dto'
import { createThrottleDefaults } from '../../config/throttle.config'

const CONTACT_THROTTLE = createThrottleDefaults({
	envTtlKey: 'CONTACT_THROTTLE_TTL',
	envLimitKey: 'CONTACT_THROTTLE_LIMIT',
	defaultTtl: 60000,
	defaultLimit: 5
})

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@ApiOperation({ summary: 'Submit contact form', description: 'Submit a public contact form (rate limited)' })
	@ApiBody({ type: ContactFormDto })
	@ApiResponse({ status: 200, description: 'Contact form submitted successfully' })
	@ApiResponse({ status: 429, description: 'Rate limit exceeded' })
	@Throttle({ default: CONTACT_THROTTLE })
	@Post()
	@SetMetadata('isPublic', true) // Contact forms should be publicly accessible
	@HttpCode(HttpStatus.OK)
	async submitContactForm(
		@Body() dto: ContactFormDto
	): Promise<ContactFormResponse> {
		return this.contactService.processContactForm(dto as ContactFormRequest)
	}
}
