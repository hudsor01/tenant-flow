import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { ContactFormRequest, ContactFormResponse } from '@repo/shared'
import { Public } from '../shared/decorators/public.decorator'
import { RouteSchema } from '../shared/decorators/route-schema.decorator'
import { ContactService } from './contact.service'

// @ApiTags('contact')
@Controller('contact')
export class ContactController {
	constructor(private readonly contactService: ContactService) {}

	@Post()
	@Public() // Contact forms should be publicly accessible
	@HttpCode(HttpStatus.OK)
	@RouteSchema({
		method: 'POST',
		path: 'contact',
		schema: {
			type: 'object',
			properties: {
				name: { type: 'string', minLength: 1, maxLength: 100 },
				email: { type: 'string', format: 'email' },
				subject: { type: 'string', minLength: 1, maxLength: 200 },
				message: { type: 'string', minLength: 10, maxLength: 5000 },
				type: { enum: ['sales', 'support', 'general'] },
				phone: {
					type: 'string',
					pattern:
						'^[\\+]?[(]?[0-9]{1,3}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,4}[-\\s\\.]?[0-9]{1,9}$',
					nullable: true
				},
				company: { type: 'string', maxLength: 100, nullable: true },
				urgency: { enum: ['LOW', 'MEDIUM', 'HIGH'], nullable: true }
			},
			required: ['name', 'email', 'subject', 'message', 'type'],
			additionalProperties: false
		}
	})
	async submitContactForm(
		@Body() dto: ContactFormRequest
	): Promise<ContactFormResponse> {
		return this.contactService.processContactForm(dto)
	}
}
