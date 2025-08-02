import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Body,
	UseGuards,
	UseInterceptors,
	Query
} from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import type { CreateTenantInput, UpdateTenantInput } from '@tenantflow/shared/types/api-inputs'
import type { TenantQuery } from '@tenantflow/shared/types/queries'


@Controller('tenants')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class TenantsController {
	constructor(
		private readonly tenantsService: TenantsService
	) {}

	@Get()
	async getTenants(
		@CurrentUser() user: ValidatedUser,
		@Query() query: TenantQuery
	) {
		const serviceQuery = {
			...query,
			limit: query.limit ? parseInt(query.limit.toString(), 10) : undefined,
			offset: query.offset ? parseInt(query.offset.toString(), 10) : undefined
		}
		return await this.tenantsService.getTenantsByOwner(
			user.id,
			serviceQuery
		)
	}

	@Get('stats')
	async getTenantStats(@CurrentUser() user: ValidatedUser) {
		return await this.tenantsService.getTenantStats(user.id)
	}

	@Get(':id')
	async getTenant(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		return await this.tenantsService.getTenantByIdOrThrow(id, user.id)
	}

	@Post()
	async createTenant(
		@Body() createTenantDto: CreateTenantInput,
		@CurrentUser() user: ValidatedUser
	) {
		return await this.tenantsService.createTenant(
			createTenantDto,
			user.id
		)
	}

	@Put(':id')
	async updateTenant(
		@Param('id') id: string,
		@Body() updateTenantDto: UpdateTenantInput,
		@CurrentUser() user: ValidatedUser
	) {
		return await this.tenantsService.updateTenant(
			id,
			updateTenantDto,
			user.id
		)
	}

	@Delete(':id')
	async deleteTenant(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		await this.tenantsService.deleteTenant(id, user.id)
		return { message: 'Tenant deleted successfully' }
	}
}