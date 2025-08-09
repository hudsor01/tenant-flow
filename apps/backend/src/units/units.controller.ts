import { Controller, Get, Query } from '@nestjs/common'
import { UnitsService } from './units.service'
import { Unit } from '@repo/database'
import type { CreateUnitInput, UpdateUnitInput } from '@repo/shared'
import { BaseCrudController } from '../common/controllers/base-crud.controller'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'

// Define a query type for units (currently no specific query DTO exists)
interface UnitQueryDto {
	propertyId?: string
	limit?: number
	offset?: number
}

// Create the base CRUD controller class
const UnitsCrudController = BaseCrudController<
	Unit,
	CreateUnitInput,
	UpdateUnitInput,
	UnitQueryDto
>({
	entityName: 'Unit',
	enableStats: true
})

@Controller('units')
export class UnitsController extends UnitsCrudController {
	constructor(private readonly unitsService: UnitsService) {
		// Cast to compatible interface - the services implement the same functionality with different signatures
		super(unitsService as any)
	}

	// Override the findAll method to handle propertyId filter
	// This maintains backward compatibility with existing API
	@Get()
	override async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query() query?: UnitQueryDto
	) {
		// If propertyId is provided in query, use the service's specific method
		if (query?.propertyId) {
			const units = await this.unitsService.getUnitsByProperty(query.propertyId, user.id)
			return {
				success: true,
				data: units,
				message: 'Units retrieved successfully'
			}
		}
		
		// Otherwise, use the base controller's findAll method
		return super.findAll(user, query || {})
	}
}
