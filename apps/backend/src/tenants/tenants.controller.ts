import { Controller } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { Tenant } from '@repo/database'
import type { CreateTenantInput, UpdateTenantInput, TenantQuery } from '@repo/shared'
import { BaseCrudController } from '../common/controllers/base-crud.controller'

// Create the base CRUD controller class using the factory
const TenantsCrudController = BaseCrudController<
	Tenant,
	CreateTenantInput, 
	UpdateTenantInput,
	TenantQuery
>({
	entityName: 'Tenant',
	enableStats: true
})

@Controller('tenants')
export class TenantsController extends TenantsCrudController {
	constructor(tenantsService: TenantsService) {
		// Cast to compatible interface - the services implement the same functionality with different signatures
		super(tenantsService as any)
	}
}