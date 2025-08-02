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
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto'


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
		@Query() query: PropertyQueryDto
	) {
		// The DTO already handles transformation and validation
		return await this.propertiesService.getByOwner(
			user.id,
			query
		)
	}

	@Get('stats')
	async getPropertyStats(@CurrentUser() user: ValidatedUser) {
		return await this.propertiesService.getStats(user.id)
	}

	@Get(':id')
	async getProperty(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		return await this.propertiesService.getByIdOrThrow(id, user.id)
	}

	@Post()
	async createProperty(
		@Body() createPropertyDto: CreatePropertyDto,
		@CurrentUser() user: ValidatedUser
	) {
		// DTO already validated and transformed
		return await this.propertiesService.create(
			createPropertyDto,
			user.id
		)
	}

	@Put(':id')
	async updateProperty(
		@Param('id') id: string,
		@Body() updatePropertyDto: UpdatePropertyDto,
		@CurrentUser() user: ValidatedUser
	) {
		// DTO already validated and transformed
		return await this.propertiesService.update(
			id,
			updatePropertyDto,
			user.id
		)
	}

	@Delete(':id')
	async deleteProperty(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		await this.propertiesService.delete(id, user.id)
		return { message: 'Property deleted successfully' }
	}
}