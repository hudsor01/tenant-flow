import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Body,
	Query,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { PropertiesService } from './properties.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import type { PropertyType } from '@prisma/client'
import type { CreatePropertyInput, UpdatePropertyInput } from '@tenantflow/shared/types/api-inputs'
import type { PropertyQuery } from '@tenantflow/shared/types/queries'

@Controller('properties')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class PropertiesController {
	constructor(
		private readonly propertiesService: PropertiesService
	) {}

	@Get()
	async getProperties(
		@CurrentUser() user: ValidatedUser,
		@Query() query: PropertyQuery
	) {
		const serviceQuery = {
			...query,
			propertyType: query.propertyType as PropertyType | undefined,
			limit: query.limit?.toString(),
			offset: query.offset?.toString()
		}
		
		return await this.propertiesService.getPropertiesByOwner(
			user.id,
			serviceQuery
		)
	}

	@Get('stats')
	async getPropertyStats(@CurrentUser() user: ValidatedUser) {
		return await this.propertiesService.getPropertyStats(user.id)
	}

	@Get(':id')
	async getProperty(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		return await this.propertiesService.getPropertyByIdOrThrow(id, user.id)
	}

	@Post()
	async createProperty(
		@Body() createPropertyDto: CreatePropertyInput,
		@CurrentUser() user: ValidatedUser
	) {
		const propertyData = {
			...createPropertyDto,
			propertyType: createPropertyDto.propertyType as PropertyType | undefined
		}
		
		return await this.propertiesService.createProperty(
			propertyData,
			user.id
		)
	}

	@Put(':id')
	async updateProperty(
		@Param('id') id: string,
		@Body() updatePropertyDto: UpdatePropertyInput,
		@CurrentUser() user: ValidatedUser
	) {
		const propertyData = {
			...updatePropertyDto,
			propertyType: updatePropertyDto.propertyType as PropertyType | undefined
		}
		
		return await this.propertiesService.updateProperty(
			id,
			propertyData,
			user.id
		)
	}

	@Delete(':id')
	async deleteProperty(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		await this.propertiesService.deleteProperty(id, user.id)
		return { message: 'Property deleted successfully' }
	}

}