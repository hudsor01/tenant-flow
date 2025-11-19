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
import { CONFIG_DEFAULTS } from '../../config/config.constants'
import { createThrottleDefaults } from '../../config/throttle.config'

const CONTACT_THROTTLE = createThrottleDefaults({
	envTtlKey: 'CONTACT_THROTTLE_TTL',
	envLimitKey: 'CONTACT_THROTTLE_LIMIT',
	defaultTtl: Number(CONFIG_DEFAULTS.CONTACT_THROTTLE_TTL),
	defaultLimit: Number(CONFIG_DEFAULTS.CONTACT_THROTTLE_LIMIT)
})

@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@Throttle({ default: CONTACT_THROTTLE })
	@Post()
	@SetMetadata('isPublic', true) // Contact forms should be publicly accessible
	@HttpCode(HttpStatus.OK)
	async submitContactForm(
		@Body() dto: ContactFormDto
	): Promise<ContactFormResponse> {
		return this.contactService.processContactForm(dto)
	}
}
