import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class UpdatePaymentMethodDto {
  @IsString()
  paymentMethodId!: string

  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean
}