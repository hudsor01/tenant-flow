import { PartialType } from '@nestjs/mapped-types'
import { CreateLeaseDto } from './create-lease.dto'
import { IsDateString, IsEnum, IsOptional } from 'class-validator'
import { LEASE_STATUS, type LeaseStatus, UpdateLeaseInput } from '@repo/shared'

export class UpdateLeaseDto
	extends PartialType(CreateLeaseDto)
	implements Omit<UpdateLeaseInput, 'id'>
{
	@IsEnum(Object.values(LEASE_STATUS), {
		message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED'
	})
	@IsOptional()
	override status?: LeaseStatus

	@IsDateString({}, { message: 'Start date must be a valid ISO date string' })
	@IsOptional()
	override startDate?: string

	@IsDateString({}, { message: 'End date must be a valid ISO date string' })
	@IsOptional()
	override endDate?: string;

	// Index signature to match UpdateLeaseInput interface
	[key: string]: unknown
}
