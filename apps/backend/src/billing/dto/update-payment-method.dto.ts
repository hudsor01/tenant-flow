import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdatePaymentMethodDto {
	@IsString()
	paymentMethodId!: string

	@IsOptional()
	@IsBoolean()
	setAsDefault?: boolean
}
