import { Controller } from '@nestjs/common'
import { PropertiesService } from './properties.service'
import { Property } from '@repo/database'
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto'
import { BaseCrudController } from '../common/controllers/base-crud.controller'
import { adaptBaseCrudService } from '../common/adapters/service.adapter'
import { BaseCrudService } from '../common/services/base-crud.service'
import type { ValidatedUser } from '../auth/auth.service'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'

// Create the base CRUD controller class with additional guards for usage limits
const PropertiesCrudController = BaseCrudController<
	Property,
	CreatePropertyDto,
	UpdatePropertyDto, 
	PropertyQueryDto
>({
	entityName: 'Property',
	enableStats: true,
	// Add usage limits guard for create operations
	additionalGuards: [UsageLimitsGuard]
})

@Controller('properties')
export class PropertiesController extends PropertiesCrudController {
	constructor(propertiesService: PropertiesService) {
		// Use adapter to make service compatible with CrudService interface
		super(adaptBaseCrudService<Property, CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto>(propertiesService as BaseCrudService<Property, CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto>))
	}

	// Override create method to add usage limit decorator
	// The factory doesn't support per-method decorators, so we override here
	@UsageLimit({ resource: 'properties', action: 'create' })
	override async create(data: CreatePropertyDto, user: ValidatedUser) {
		return super.create(data, user)
	}
}