import { createZodDto } from 'nestjs-zod'
import { sendPaymentReminderSchema } from '@repo/shared/validation/tenants'

export class SendPaymentReminderDto extends createZodDto(sendPaymentReminderSchema) {}
