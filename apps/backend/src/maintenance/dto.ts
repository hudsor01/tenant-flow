import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsArray,
	IsBoolean,
	IsDateString,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	IsUrl,
	IsUUID,
	Length,
	Max,
	Min
} from 'class-validator'
import { Transform } from 'class-transformer'
import { MAINTENANCE_CATEGORY, PRIORITY, REQUEST_STATUS, type MaintenanceCategory } from '@repo/shared'

export type MaintenancePriority = (typeof PRIORITY)[keyof typeof PRIORITY]
export type MaintenanceStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS]

export { MAINTENANCE_CATEGORY, PRIORITY as MaintenancePriorityEnum, REQUEST_STATUS as MaintenanceStatusEnum }

export class MaintenanceCreateDto {
	@ApiProperty({ 
		description: 'Title of the maintenance request',
		example: 'Leaky faucet in kitchen'
	})
	@IsString()
	@Length(5, 200)
	declare title: string

	@ApiProperty({ 
		description: 'Detailed description of the issue',
		example: 'The kitchen faucet has been dripping for several days. Water is pooling around the base.'
	})
	@IsString()
	@Length(10, 2000)
	declare description: string

	@ApiProperty({ 
		description: 'Priority level of the request',
		enum: PRIORITY,
		example: PRIORITY.MEDIUM
	})
	@IsEnum(PRIORITY)
	declare priority: MaintenancePriority

	@ApiProperty({ 
		description: 'Category of maintenance',
		enum: MAINTENANCE_CATEGORY,
		example: MAINTENANCE_CATEGORY.PLUMBING
	})
	@IsEnum(MAINTENANCE_CATEGORY)
	declare category: MaintenanceCategory

	@ApiProperty({ 
		description: 'Unit ID where maintenance is needed',
		example: 'unit-123e4567-e89b-12d3-a456-426614174000'
	})
	@IsUUID()
	declare unitId: string

	@ApiPropertyOptional({ 
		description: 'Tenant ID if reported by tenant',
		example: 'tenant-123e4567-e89b-12d3-a456-426614174000'
	})
	@IsOptional()
	@IsUUID()
	tenantId?: string

	@ApiPropertyOptional({ 
		description: 'User ID to assign this request to',
		example: 'user-123e4567-e89b-12d3-a456-426614174000'
	})
	@IsOptional()
	@IsUUID()
	assignedTo?: string

	@ApiPropertyOptional({ 
		description: 'Estimated cost in dollars',
		example: 150.00
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(1000000)
	@Transform(({ value }) => parseFloat(value))
	estimatedCost?: number

	@ApiPropertyOptional({ 
		description: 'Array of image URLs',
		example: ['https://example.com/image1.jpg']
	})
	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	images?: string[]

	@ApiPropertyOptional({ 
		description: 'Additional notes',
		example: 'Tenant mentioned this started after recent cold weather'
	})
	@IsOptional()
	@IsString()
	@Length(0, 1000)
	notes?: string

	@ApiPropertyOptional({ 
		description: 'Preferred completion date',
		example: '2024-02-15T10:00:00Z'
	})
	@IsOptional()
	@IsDateString()
	scheduledDate?: string

	@ApiPropertyOptional({ 
		description: 'Access instructions for maintenance workers',
		example: 'Key is under the mat, please call before arriving'
	})
	@IsOptional()
	@IsString()
	@Length(0, 500)
	accessInstructions?: string

	@ApiPropertyOptional({ 
		description: 'Allow maintenance workers to enter without tenant present',
		example: false
	})
	@IsOptional()
	@IsBoolean()
	allowEntry?: boolean
}

export class MaintenanceUpdateDto {
	@ApiPropertyOptional({ 
		description: 'Title of the maintenance request',
		example: 'Leaky faucet in kitchen - URGENT'
	})
	@IsOptional()
	@IsString()
	@Length(5, 200)
	title?: string

	@ApiPropertyOptional({ 
		description: 'Detailed description of the issue'
	})
	@IsOptional()
	@IsString()
	@Length(10, 2000)
	description?: string

	@ApiPropertyOptional({ 
		description: 'Priority level of the request',
		enum: PRIORITY
	})
	@IsOptional()
	@IsEnum(PRIORITY)
	priority?: MaintenancePriority

	@ApiPropertyOptional({ 
		description: 'Category of maintenance',
		enum: MAINTENANCE_CATEGORY
	})
	@IsOptional()
	@IsEnum(MAINTENANCE_CATEGORY)
	category?: MaintenanceCategory

	@ApiPropertyOptional({ 
		description: 'Status of the request',
		enum: REQUEST_STATUS
	})
	@IsOptional()
	@IsEnum(REQUEST_STATUS)
	status?: MaintenanceStatus

	@ApiPropertyOptional({ 
		description: 'Unit ID if specific to a unit'
	})
	@IsOptional()
	@IsUUID()
	unitId?: string

	@ApiPropertyOptional({ 
		description: 'Tenant ID if reported by tenant'
	})
	@IsOptional()
	@IsUUID()
	tenantId?: string

	@ApiPropertyOptional({ 
		description: 'User ID to assign this request to'
	})
	@IsOptional()
	@IsUUID()
	assignedTo?: string

	@ApiPropertyOptional({ 
		description: 'Estimated cost in dollars'
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(1000000)
	@Transform(({ value }) => parseFloat(value))
	estimatedCost?: number

	@ApiPropertyOptional({ 
		description: 'Actual cost in dollars'
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(1000000)
	@Transform(({ value }) => parseFloat(value))
	actualCost?: number

	@ApiPropertyOptional({ 
		description: 'Array of image URLs'
	})
	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	images?: string[]

	@ApiPropertyOptional({ 
		description: 'Additional notes'
	})
	@IsOptional()
	@IsString()
	@Length(0, 1000)
	notes?: string

	@ApiPropertyOptional({ 
		description: 'Preferred completion date'
	})
	@IsOptional()
	@IsDateString()
	scheduledDate?: string

	@ApiPropertyOptional({ 
		description: 'Access instructions for maintenance workers'
	})
	@IsOptional()
	@IsString()
	@Length(0, 500)
	accessInstructions?: string

	@ApiPropertyOptional({ 
		description: 'Vendor ID if assigned to external vendor'
	})
	@IsOptional()
	@IsUUID()
	vendorId?: string

	@ApiPropertyOptional({ 
		description: 'Vendor notes and feedback'
	})
	@IsOptional()
	@IsString()
	@Length(0, 1000)
	vendorNotes?: string

	@ApiPropertyOptional({ 
		description: 'Completion date'
	})
	@IsOptional()
	@IsDateString()
	completedAt?: string
}

export class MaintenanceQueryDto {
	@ApiPropertyOptional({ 
		description: 'Filter by status',
		enum: REQUEST_STATUS
	})
	@IsOptional()
	@IsEnum(REQUEST_STATUS)
	status?: MaintenanceStatus

	@ApiPropertyOptional({ 
		description: 'Filter by priority',
		enum: PRIORITY
	})
	@IsOptional()
	@IsEnum(PRIORITY)
	priority?: MaintenancePriority

	@ApiPropertyOptional({ 
		description: 'Filter by category',
		enum: MAINTENANCE_CATEGORY
	})
	@IsOptional()
	@IsEnum(MAINTENANCE_CATEGORY)
	category?: MaintenanceCategory

	@ApiPropertyOptional({ 
		description: 'Filter by unit ID'
	})
	@IsOptional()
	@IsUUID()
	unitId?: string

	@ApiPropertyOptional({ 
		description: 'Filter by tenant ID'
	})
	@IsOptional()
	@IsUUID()
	tenantId?: string

	@ApiPropertyOptional({ 
		description: 'Filter by assigned user ID'
	})
	@IsOptional()
	@IsUUID()
	assignedTo?: string

	@ApiPropertyOptional({ 
		description: 'Search text in title and description'
	})
	@IsOptional()
	@IsString()
	search?: string

	@ApiPropertyOptional({ 
		description: 'Filter from date (ISO string)'
	})
	@IsOptional()
	@IsDateString()
	dateFrom?: string

	@ApiPropertyOptional({ 
		description: 'Filter to date (ISO string)'
	})
	@IsOptional()
	@IsDateString()
	dateTo?: string

	@ApiPropertyOptional({ 
		description: 'Minimum cost filter'
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Transform(({ value }) => parseFloat(value))
	minCost?: number

	@ApiPropertyOptional({ 
		description: 'Maximum cost filter'
	})
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Transform(({ value }) => parseFloat(value))
	maxCost?: number
}