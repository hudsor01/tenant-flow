import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'
import { Transform } from 'class-transformer'
import { CreateTenantInput } from '@repo/shared'

export class TenantCreateDto implements CreateTenantInput {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be valid' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string

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

  @IsOptional()
  @IsString({ message: 'Emergency phone must be a string' })
  @Length(10, 20, { message: 'Emergency phone must be between 10 and 20 characters' })
  @Transform(({ value }) => value?.trim())
  emergencyPhone?: string

  @IsOptional()
  @IsString({ message: 'Move in date must be a string' })
  @Transform(({ value }) => value?.trim())
  moveInDate?: string

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(1, 1000, { message: 'Notes must be between 1 and 1000 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string
}