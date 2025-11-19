import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createPaymentSchema = z.object({
	tenant_id: z.string().uuid({ message: 'tenant_id must be a valid UUID' }),
	lease_id: z.string().uuid({ message: 'lease_id must be a valid UUID' }),
	amount: z
		.number({ message: 'amount is required' })
		.int({ message: 'amount must be an integer number of cents' })
		.positive({ message: 'amount must be greater than 0' }),
	paymentMethodId: z
		.string({ message: 'paymentMethodId is required' })
		.min(1, 'paymentMethodId is required')
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}
