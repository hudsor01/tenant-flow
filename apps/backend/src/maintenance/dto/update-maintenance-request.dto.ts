import { PartialType } from '@nestjs/mapped-types'
import { CreateMaintenanceRequestDto } from './create-maintenance-request.dto'
import { IsEnum, IsOptional } from 'class-validator'
import { PRIORITY, Priority, REQUEST_STATUS, RequestStatus } from '@repo/shared'

export class UpdateMaintenanceRequestDto extends PartialType(
	CreateMaintenanceRequestDto
) {
	@IsEnum(REQUEST_STATUS, {
		message:
			'Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELED, ON_HOLD'
	})
	@IsOptional()
	override status?: RequestStatus

	@IsEnum(PRIORITY, {
		message: 'Priority must be one of: LOW, MEDIUM, HIGH, EMERGENCY'
	})
	@IsOptional()
	override priority?: Priority
}
