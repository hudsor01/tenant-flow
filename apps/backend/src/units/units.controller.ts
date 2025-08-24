import { 
	Controller, 
	Get, 
	Post, 
	Body, 
	Param, 
	Delete, 
	Put,
	Query,
	UseGuards,
	Logger,
	ParseUUIDPipe,
	ValidationPipe
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'
import { UnifiedAuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '../auth/auth.service'
import { UnitsService } from './units.service'
import type { CreateUnitDto, UpdateUnitDto, UnitQueryDto, UpdateUnitAvailabilityDto } from './dto'
import type { 
	Unit,
	UnitStats,
	ControllerApiResponse 
} from '@repo/shared'

@ApiTags('units')
@Controller('units')
@UseGuards(ThrottlerGuard, UnifiedAuthGuard)
export class UnitsController {
	private readonly logger = new Logger(UnitsController.name)

	constructor(private readonly unitsService: UnitsService) {}

	@Get()
	@ApiOperation({ summary: 'Get all units for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Units retrieved successfully' })
	@ApiQuery({ name: 'propertyId', required: false, description: 'Filter by property ID' })
	@ApiQuery({ name: 'status', required: false, description: 'Filter by unit status' })
	@ApiQuery({ name: 'search', required: false, description: 'Search by unit number or description' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results' })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of results to skip' })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false })) query: UnitQueryDto
	): Promise<ControllerApiResponse<Unit[]>> {
		this.logger.log(`Getting units for user ${user.id}`)
		
		try {
			const data = await this.unitsService.findAll(user.id, query)
			
			return {
				success: true,
				data,
				message: `Retrieved ${data.length} units successfully`,
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error getting units for user ${user.id}:`, error)
			throw error
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get unit statistics for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Unit statistics retrieved successfully' })
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<UnitStats>> {
		this.logger.log(`Getting unit stats for user ${user.id}`)
		
		try {
			const data = await this.unitsService.getStats(user.id)
			
			return {
				success: true,
				data,
				message: 'Unit statistics retrieved successfully',
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error getting unit stats for user ${user.id}:`, error)
			throw error
		}
	}

	@Get('by-property/:propertyId')
	@ApiOperation({ summary: 'Get all units for a specific property' })
	@ApiResponse({ status: 200, description: 'Units for property retrieved successfully' })
	async findByProperty(
		@CurrentUser() user: ValidatedUser,
		@Param('propertyId', ParseUUIDPipe) propertyId: string
	): Promise<ControllerApiResponse<Unit[]>> {
		this.logger.log(`Getting units for property ${propertyId} for user ${user.id}`)
		
		try {
			const data = await this.unitsService.findByProperty(user.id, propertyId)
			
			return {
				success: true,
				data,
				message: `Retrieved ${data.length} units for property successfully`,
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error getting units for property ${propertyId}:`, error)
			throw error
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific unit by ID' })
	@ApiResponse({ status: 200, description: 'Unit retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<ControllerApiResponse<Unit>> {
		this.logger.log(`Getting unit ${id} for user ${user.id}`)
		
		try {
			const data = await this.unitsService.findOne(user.id, id)
			
			return {
				success: true,
				data,
				message: 'Unit retrieved successfully',
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error getting unit ${id}:`, error)
			throw error
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create a new unit' })
	@ApiResponse({ status: 201, description: 'Unit created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input data' })
	@ApiResponse({ status: 429, description: 'Too many requests' })
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) createUnitDto: CreateUnitDto
	): Promise<ControllerApiResponse<Unit>> {
		this.logger.log(`Creating unit for user ${user.id}`)
		
		try {
			const data = await this.unitsService.create(user.id, createUnitDto)
			
			return {
				success: true,
				data,
				message: 'Unit created successfully',
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error creating unit for user ${user.id}:`, error)
			throw error
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update a unit' })
	@ApiResponse({ status: 200, description: 'Unit updated successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) updateUnitDto: UpdateUnitDto
	): Promise<ControllerApiResponse<Unit>> {
		this.logger.log(`Updating unit ${id} for user ${user.id}`)
		
		try {
			const data = await this.unitsService.update(user.id, id, updateUnitDto)
			
			return {
				success: true,
				data,
				message: 'Unit updated successfully',
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error updating unit ${id}:`, error)
			throw error
		}
	}

	@Put(':id/availability')
	@ApiOperation({ summary: 'Update unit availability status' })
	@ApiResponse({ status: 200, description: 'Unit availability updated successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async updateAvailability(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) updateUnitAvailabilityDto: UpdateUnitAvailabilityDto
	): Promise<ControllerApiResponse<Unit>> {
		this.logger.log(`Updating availability for unit ${id} for user ${user.id}`)
		
		try {
			const data = await this.unitsService.updateAvailability(user.id, id, updateUnitAvailabilityDto.available)
			
			return {
				success: true,
				data,
				message: `Unit marked as ${updateUnitAvailabilityDto.available ? 'available' : 'unavailable'} successfully`,
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error updating availability for unit ${id}:`, error)
			throw error
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a unit' })
	@ApiResponse({ status: 200, description: 'Unit deleted successfully' })
	@ApiResponse({ status: 404, description: 'Unit not found' })
	async remove(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<ControllerApiResponse<void>> {
		this.logger.log(`Deleting unit ${id} for user ${user.id}`)
		
		try {
			await this.unitsService.remove(user.id, id)
			
			return {
				success: true,
				data: undefined,
				message: 'Unit deleted successfully',
				timestamp: new Date()
			}
		} catch (error) {
			this.logger.error(`Error deleting unit ${id}:`, error)
			throw error
		}
	}
}