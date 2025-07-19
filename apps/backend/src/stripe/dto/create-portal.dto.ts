import { IsString, IsOptional } from 'class-validator'

export class CreatePortalDto {
	@IsString()
	userId!: string

	@IsOptional()
	@IsString()
	returnUrl?: string
}