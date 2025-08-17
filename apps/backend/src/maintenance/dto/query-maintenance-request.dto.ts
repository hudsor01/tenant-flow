import {
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import {
	MAINTENANCE_CATEGORY,
	MaintenanceCategory,
	PRIORITY,
	Priority,
	REQUEST_STATUS,
	RequestStatus
} from '@repo/shared'

export class MaintenanceRequestQueryDto {
	@IsOptional()
	@IsEnum(REQUEST_STATUS, {
		message:
			'Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELED, ON_HOLD'
	})
	status?: RequestStatus

	@IsOptional()
	@IsEnum(PRIORITY, {
		message: 'Priority must be one of: LOW, MEDIUM, HIGH, EMERGENCY'
	})
	priority?: Priority

	@IsOptional()
	@IsEnum(MAINTENANCE_CATEGORY, {
		message: 'Category must be a valid maintenance category'
	})
	category?: MaintenanceCategory

	@IsOptional()
	@IsUUID(4, { message: 'Unit ID must be a valid UUID' })
	unitId?: string

	@IsOptional()
	@IsString()
	@Transform(({ value }) => value?.trim())
	search?: string

	@Type(() => Number)
	@IsInt({ message: 'Page must be an integer' })
	@Min(1, { message: 'Page must be at least 1' })
	page = 1

	@Type(() => Number)
	@IsInt({ message: 'Limit must be an integer' })
	@Min(1, { message: 'Limit must be at least 1' })
	@Max(100, { message: 'Limit cannot exceed 100' })
	limit = 20

	@IsOptional()
	@Type(() => Number)
	@IsInt({ message: 'Offset must be an integer' })
	@Min(0, { message: 'Offset must be at least 0' })
	offset?: number

	@IsOptional()
	@IsEnum(
		[
			'priority',
			'status',
			'title',
			'estimatedCost',
			'createdAt',
			'scheduledDate'
		],
		{
			message:
				'sortBy must be one of: priority, status, title, estimatedCost, createdAt, scheduledDate'
		}
	)
	sortBy?:
		| 'priority'
		| 'status'
		| 'title'
		| 'estimatedCost'
		| 'createdAt'
		| 'scheduledDate'

	@IsEnum(['asc', 'desc'])
	sortOrder: 'asc' | 'desc' = 'desc'
}
