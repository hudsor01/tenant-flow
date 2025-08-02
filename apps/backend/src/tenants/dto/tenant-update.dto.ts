import { IsEmail, IsOptional, IsString, Length } from 'class-validator'
import { Transform } from 'class-transformer'

export class TenantUpdateDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string

  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Length(10, 20, { message: 'Phone must be between 10 and 20 characters' })
  @Transform(({ value }) => value?.trim())
  phone?: string

  @IsOptional()
  @IsString({ message: 'Emergency contact must be a string' })
  @Length(1, 200, { message: 'Emergency contact must be between 1 and 200 characters' })
  @Transform(({ value }) => value?.trim())
  emergencyContact?: string
}