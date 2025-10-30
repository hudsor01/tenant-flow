import { createZodDto } from 'nestjs-zod'
import { contactFormSchema } from '@repo/shared/validation/contact'

export class ContactFormDto extends createZodDto(contactFormSchema) {}
