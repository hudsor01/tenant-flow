import { Module } from '@nestjs/common'
import { RepositoriesModule } from '../repositories/repositories.module'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'

/**
 * Tenants module - Repository Pattern Implementation
 * Controller → Service → Repository → Database
 * TenantsService uses ITenantsRepository for data access
 */
@Module({
	imports: [RepositoriesModule],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}
