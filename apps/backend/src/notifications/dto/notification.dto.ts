import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator'

export enum Priority {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	URGENT = 'urgent'
}

export interface MaintenanceNotificationData {
	propertyId: string
	propertyName: string
	requestId: string
	description: string
	priority: Priority
	tenantName?: string
	requestDate: string
}

export class CreateNotificationDto {
	@IsString()
	title!: string

	@IsString()
	message!: string

	@IsEnum(Priority)
	priority!: Priority

	@IsString()
	@IsOptional()
	type?: string

	@IsObject()
	@IsOptional()
	data?: Record<string, unknown>
}

export class UpdateNotificationDto {
	@IsString()
	@IsOptional()
	title?: string

	@IsString()
	@IsOptional()
	message?: string

	@IsEnum(Priority)
	@IsOptional()
	priority?: Priority

	@IsString()
	@IsOptional()
	type?: string

	@IsObject()
	@IsOptional()
	data?: Record<string, unknown>
}