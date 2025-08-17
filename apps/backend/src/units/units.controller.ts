import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UnitsService } from './units.service'
import { UnitCreateDto, UnitQueryDto, UnitUpdateDto } from './dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'

@ApiTags('units')
@Controller('units')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class UnitsController {
	constructor(private readonly unitsService: UnitsService) {}

	@Get()
	@ApiOperation({ summary: 'Get all units' })
	@ApiResponse({ status: 200, description: 'Units retrieved successfully' })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query() query?: UnitQueryDto
	) {
		// If propertyId is provided in query, use the service's specific method
		if (query?.propertyId) {
			const units = await this.unitsService.getUnitsByProperty(
				query.propertyId,
				user.id,
				user.supabaseAccessToken
			)
			return {
				success: true,
				data: units,
				message: 'Units retrieved successfully'
			}
		}

		// Otherwise, get all units for the user
		const units = await this.unitsService.findAll(
			user.id,
			query,
			user.id,
			user.supabaseAccessToken
		)
		return {
			success: true,
			data: units,
			message: 'Units retrieved successfully'
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a unit by ID' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async findOne(@CurrentUser() user: ValidatedUser, @Param('id') id: string) {
		const unit = await this.unitsService.findById(
			id,
			user.id,
			user.id,
			user.supabaseAccessToken
		)
		return {
			success: true,
			data: unit,
			message: 'Unit retrieved successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create a new unit' })
	@ApiResponse({ status: 201, description: 'Unit created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@UsageLimit('units')
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createUnitDto: UnitCreateDto
	) {
		const unit = await this.unitsService.create(
			createUnitDto,
			user.id,
			user.id,
			user.supabaseAccessToken
		)
		return {
			success: true,
			data: unit,
			message: 'Unit created successfully'
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update a unit' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit updated successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id') id: string,
		@Body() updateUnitDto: UnitUpdateDto
	) {
		const unit = await this.unitsService.update(
			id,
			updateUnitDto,
			user.id,
			user.id,
			user.supabaseAccessToken
		)
		return {
			success: true,
			data: unit,
			message: 'Unit updated successfully'
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a unit' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({ status: 200, description: 'Unit deleted successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async delete(@CurrentUser() user: ValidatedUser, @Param('id') id: string) {
		await this.unitsService.delete(
			id,
			user.id,
			user.id,
			user.supabaseAccessToken
		)
		return {
			success: true,
			message: 'Unit deleted successfully'
		}
	}

	@Put(':id/status')
	@ApiOperation({ summary: 'Update unit status' })
	@ApiParam({ name: 'id', description: 'Unit ID' })
	@ApiResponse({
		status: 200,
		description: 'Unit status updated successfully'
	})
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async updateStatus(
		@CurrentUser() user: ValidatedUser,
		@Param('id') id: string,
		@Body('status') status: string
	) {
		const unit = await this.unitsService.updateStatus(
			id,
			status,
			user.id,
			user.id,
			user.supabaseAccessToken
		)
		return {
			success: true,
			data: unit,
			message: 'Unit status updated successfully'
		}
	}
}
