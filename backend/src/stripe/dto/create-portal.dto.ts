import { IsString } from 'class-validator'

export class CreatePortalDto {
	@IsString()
	userId!: string
}