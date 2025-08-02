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
import { UnitsService } from './units.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import type { CreateUnitInput, UpdateUnitInput } from '@tenantflow/shared'
import { UnitUpdateDto } from './dto'



@Controller('units')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class UnitsController {
	constructor(private readonly unitsService: UnitsService) {}

	@Get()
	async getUnits(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId') propertyId?: string
	) {
		if (propertyId) {
			return await this.unitsService.getUnitsByProperty(
				propertyId,
				user.id
			)
		}
		return await this.unitsService.getUnitsByOwner(user.id)
	}

	@Get('stats')
	async getUnitStats(@CurrentUser() user: ValidatedUser) {
		return await this.unitsService.getUnitStats(user.id)
	}

	@Get(':id')
	async getUnit(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		return await this.unitsService.getUnitByIdOrThrow(id, user.id)
	}

	@Post()
	async createUnit(
		@Body() createUnitDto: CreateUnitInput,
		@CurrentUser() user: ValidatedUser
	) {
		// Map CreateUnitInput to service-compatible format
		const unitData = {
			...createUnitDto,
			rent: createUnitDto.monthlyRent
		}
		
		return await this.unitsService.createUnit(
			user.id,
			unitData
		)
	}

	@Put(':id')
	async updateUnit(
		@Param('id') id: string,
		@Body() updateUnitDto: UpdateUnitInput,
		@CurrentUser() user: ValidatedUser
	) {
		// Convert lastInspectionDate string to Date if provided and cast to UnitUpdateDto
		const unitData: UnitUpdateDto = {
			...updateUnitDto,
			status: updateUnitDto.status as UnitUpdateDto['status'],
			lastInspectionDate: updateUnitDto.lastInspectionDate as string | undefined
		}

		return await this.unitsService.updateUnit(id, user.id, unitData)
	}

	@Delete(':id')
	async deleteUnit(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	) {
		await this.unitsService.deleteUnit(id, user.id)
		return { message: 'Unit deleted successfully' }
	}
}
