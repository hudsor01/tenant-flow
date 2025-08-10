import { Controller, Get, Query } from '@nestjs/common'
import { UnitsService } from './units.service'
import { Unit } from '@repo/database'
import type { CreateUnitInput, UpdateUnitInput } from '@repo/shared'
import { UnitQueryDto } from './dto'
import { BaseCrudController } from '../common/controllers/base-crud.controller'
import { adaptBaseCrudService } from '../common/adapters/service.adapter'
import { BaseCrudService } from '../common/services/base-crud.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'


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
		// Use adapter to make service compatible with CrudService interface
		super(adaptBaseCrudService<Unit, CreateUnitInput, UpdateUnitInput, UnitQueryDto>(unitsService as BaseCrudService<Unit, CreateUnitInput, UpdateUnitInput, UnitQueryDto>))
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
