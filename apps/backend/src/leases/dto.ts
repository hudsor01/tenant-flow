import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateLeaseDto {
  @ApiProperty({ description: 'Property ID' })
  @IsUUID()
  property_id!: string

  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  tenant_id!: string

  @ApiProperty({ description: 'Monthly rent amount' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rent_amount!: number

  @ApiProperty({ description: 'Lease start date' })
  @IsDateString()
  start_date!: string

  @ApiProperty({ description: 'Lease end date' })
  @IsDateString()
  end_date!: string

  @ApiProperty({ description: 'Security deposit amount' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  security_deposit!: number

  @ApiProperty({ description: 'Days before late fee applies' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  late_fee_grace_days!: number

  @ApiProperty({ description: 'Daily late fee amount' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  late_fee_amount!: number

  @ApiPropertyOptional({ description: 'Tenant signature data' })
  @IsOptional()
  @IsString()
  tenant_signature?: string

  @ApiPropertyOptional({ description: 'Date tenant signed' })
  @IsOptional()
  @IsDateString()
  tenant_signature_date?: string

  @ApiPropertyOptional({ description: 'Landlord signature data' })
  @IsOptional()
  @IsString()
  landlord_signature?: string

  @ApiPropertyOptional({ description: 'Date landlord signed' })
  @IsOptional()
  @IsDateString()
  landlord_signature_date?: string
}

export class UpdateLeaseDto {
  @ApiPropertyOptional({ description: 'Property ID' })
  @IsOptional()
  @IsUUID()
  property_id?: string

  @ApiPropertyOptional({ description: 'Tenant ID' })
  @IsOptional()
  @IsUUID()
  tenant_id?: string

  @ApiPropertyOptional({ description: 'Monthly rent amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rent_amount?: number

  @ApiPropertyOptional({ description: 'Lease start date' })
  @IsOptional()
  @IsDateString()
  start_date?: string

  @ApiPropertyOptional({ description: 'Lease end date' })
  @IsOptional()
  @IsDateString()
  end_date?: string

  @ApiPropertyOptional({ description: 'Security deposit amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  security_deposit?: number

  @ApiPropertyOptional({ description: 'Days before late fee applies' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  late_fee_grace_days?: number

  @ApiPropertyOptional({ description: 'Daily late fee amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  late_fee_amount?: number

  @ApiPropertyOptional({ description: 'Tenant signature data' })
  @IsOptional()
  @IsString()
  tenant_signature?: string

  @ApiPropertyOptional({ description: 'Date tenant signed' })
  @IsOptional()
  @IsDateString()
  tenant_signature_date?: string

  @ApiPropertyOptional({ description: 'Landlord signature data' })
  @IsOptional()
  @IsString()
  landlord_signature?: string

  @ApiPropertyOptional({ description: 'Date landlord signed' })
  @IsOptional()
  @IsDateString()
  landlord_signature_date?: string
}