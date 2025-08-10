import { Controller } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { Tenant } from '@repo/database'
import type { CreateTenantInput, UpdateTenantInput, TenantQuery } from '@repo/shared'
import { BaseCrudController } from '../common/controllers/base-crud.controller'
import { adaptBaseCrudService } from '../common/adapters/service.adapter'
import { BaseCrudService } from '../common/services/base-crud.service'

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
		// Use adapter to make service compatible with CrudService interface
		super(adaptBaseCrudService<Tenant, CreateTenantInput, UpdateTenantInput, TenantQuery>(tenantsService as BaseCrudService<Tenant, CreateTenantInput, UpdateTenantInput, TenantQuery>))
	}
}