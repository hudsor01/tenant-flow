import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Request,
	UnauthorizedException,
	UploadedFile,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import {
	BUSINESS_ERROR_CODES,
	ERROR_TYPES
} from '@repo/shared/constants/error-codes'
import { PropertiesService } from './properties.service'
import { PropertyLifecycleService } from './services/property-lifecycle.service'
import { PropertyBulkImportService } from './services/property-bulk-import.service'
import { DashboardStatsService } from '../dashboard/dashboard-stats.service'
import { CreatePropertyDto } from './dto/create-property.dto'
import { UpdatePropertyDto } from './dto/update-property.dto'
import { MarkPropertyAsSoldDto } from './dto/mark-sold.dto'
import { AppLogger } from '../../logger/app-logger.service'
import {
	normalizeLimit,
	normalizeOffset
} from '../../shared/utils/pagination.utils'

@ApiTags('Properties')
@ApiBearerAuth('supabase-auth')
@Controller('properties')
export class PropertiesController {
	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly propertyLifecycleService: PropertyLifecycleService,
		private readonly propertyBulkImportService: PropertyBulkImportService,
		private readonly dashboardStatsService: DashboardStatsService,
		private readonly logger: AppLogger
	) {}

	// ========================================
	// Query Endpoints
	// ========================================

	@ApiOperation({ summary: 'List all properties', description: 'Get all properties for the authenticated user with pagination' })
	@ApiQuery({ name: 'search', required: false, description: 'Search term for filtering properties' })
	@ApiQuery({ name: 'status', required: false, description: 'Filter by property status (active, inactive, sold). Defaults to excluding inactive.' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-50)', example: 10 })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
	@ApiResponse({ status: 200, description: 'List of properties with pagination info' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@SkipSubscriptionCheck()
	@Get()
	async findAll(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const safeLimit = normalizeLimit(limit)
		const safeOffset = normalizeOffset(offset)

		const result = await this.propertiesService.findAll(token, {
			search,
			status,
			limit: safeLimit,
			offset: safeOffset
		})

		// Calculate pagination metadata
		const page = Math.floor(safeOffset / safeLimit) + 1
		const totalPages = Math.ceil(result.count / safeLimit)

		return {
			data: result.data,
			total: result.count,
			pagination: {
				page,
				limit: safeLimit,
				total: result.count,
				totalPages
			}
		}
	}

	@ApiOperation({ summary: 'Get property statistics', description: 'Returns aggregated property stats (total, occupied, vacant, etc.)' })
	@ApiResponse({ status: 200, description: 'Property statistics' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('stats')
	async getStats(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const dashboardStats = await this.dashboardStatsService.getStats(
			req.user.id,
			token
		)
		return dashboardStats.properties
	}

	@ApiOperation({ summary: 'List properties with units', description: 'Get all properties with their associated units for stat calculations' })
	@ApiQuery({ name: 'search', required: false, description: 'Search term for filtering' })
	@ApiQuery({ name: 'status', required: false, description: 'Filter by property status (active, inactive, sold). Defaults to excluding inactive.' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-50)', example: 10 })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
	@ApiResponse({ status: 200, description: 'List of properties with their units' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('with-units')
	async findAllWithUnits(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Request() req: AuthenticatedRequest
	) {
		const safeLimit = normalizeLimit(limit)
		const safeOffset = normalizeOffset(offset)
		return this.propertiesService.findAllWithUnits(req, {
			search,
			status,
			limit: safeLimit,
			offset: safeOffset
		})
	}

	@ApiOperation({ summary: 'Get property by ID', description: 'Get a single property by its UUID' })
	@ApiParam({ name: 'id', type: String, description: 'Property UUID' })
	@ApiResponse({ status: 200, description: 'Property details' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@Get(':id')
	@SkipSubscriptionCheck()
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		return this.propertiesService.findOne(req, id)
	}

	// ========================================
	// CRUD Endpoints
	// ========================================

	@ApiOperation({ summary: 'Create property', description: 'Create a new property' })
	@ApiBody({ type: CreatePropertyDto })
	@ApiResponse({ status: 201, description: 'Property created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post()
	async create(
		@Body() dto: CreatePropertyDto,
		@Request() req: AuthenticatedRequest
	) {
		console.log('🔥 BACKEND: Property create endpoint called!', {
			name: dto.name,
			user: req.user?.id,
			timestamp: new Date().toISOString()
		})
		const result = await this.propertiesService.create(req, dto)
		console.log('🔥 BACKEND: Property created!', { id: result.id, name: result.name })
		return result
	}

	@ApiOperation({ summary: 'Bulk import properties', description: 'Import multiple properties from a CSV file. Maximum file size: 5MB' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		description: 'CSV file with property data',
		schema: {
			type: 'object',
			properties: {
				file: {
					type: 'string',
					format: 'binary',
					description: 'CSV file containing property data'
				}
			}
		}
	})
	@ApiResponse({ status: 201, description: 'Properties imported successfully' })
	@ApiResponse({ status: 400, description: 'Invalid file type or validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('bulk-import')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
			limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
		})
	)
	async bulkImport(
		@UploadedFile() file: Express.Multer.File,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		this.logger.log('Bulk import request received', {
			hasFile: !!file,
			fileName: file?.originalname,
			fileSize: file?.size,
			mimetype: file?.mimetype,
			user_id: req.user?.id
		})

		if (!file) {
			throw new BadRequestException({
				code: BUSINESS_ERROR_CODES.NO_FILE_UPLOADED,
				message: 'No file uploaded'
			})
		}

		const allowedMimeTypes = [
			'text/csv',
			'application/csv',
			'text/plain',
			'application/octet-stream',
			'application/vnd.ms-excel'
		]
		const isValidType =
			allowedMimeTypes.includes(file.mimetype) ||
			file.originalname?.toLowerCase().endsWith('.csv')

		if (!isValidType) {
			this.logger.warn('Invalid file type for bulk import', {
				mimetype: file.mimetype,
				originalname: file.originalname,
				user_id: req.user?.id
			})
			throw new BadRequestException({
				code: BUSINESS_ERROR_CODES.INVALID_FILE_TYPE,
				message: `Invalid file type: ${file.mimetype}. Only CSV files (.csv) are allowed`
			})
		}

		return this.propertyBulkImportService.bulkImport(
			token,
			req.user.id,
			file.buffer
		)
	}

	@ApiOperation({ summary: 'Update property', description: 'Update an existing property by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Property UUID' })
	@ApiBody({ type: UpdatePropertyDto })
	@ApiResponse({ status: 200, description: 'Property updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdatePropertyDto,
		@Request() req: AuthenticatedRequest,
		@Body('version') expectedVersion?: number
	) {
		const property = await this.propertiesService.update(
			req,
			id,
			dto,
			expectedVersion
		)
		if (!property) {
			throw new NotFoundException({
				code: BUSINESS_ERROR_CODES.PROPERTY_NOT_FOUND,
				message: 'Property not found'
			})
		}
		return property
	}

	@ApiOperation({ summary: 'Delete property', description: 'Delete a property by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Property UUID' })
	@ApiResponse({ status: 200, description: 'Property deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		await this.propertyLifecycleService.remove(req, id)
		return { message: 'Property deleted successfully' }
	}

	// ========================================
	// Lifecycle Endpoints
	// ========================================

	@ApiOperation({ summary: 'Mark property as sold', description: 'Mark a property as sold with sale date and price' })
	@ApiParam({ name: 'id', type: String, description: 'Property UUID' })
	@ApiBody({ type: MarkPropertyAsSoldDto })
	@ApiResponse({ status: 200, description: 'Property marked as sold successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@Put(':id/mark-sold')
	async markPropertyAsSold(
		@Param('id', ParseUUIDPipe) property_id: string,
		@Body() dto: MarkPropertyAsSoldDto,
		@Request() req: AuthenticatedRequest
	) {
		if (!req.user?.id) {
			throw new UnauthorizedException({
				code: ERROR_TYPES.AUTHENTICATION_ERROR,
				message: 'Authentication required'
			})
		}

		return this.propertyLifecycleService.markAsSold(
			req,
			property_id,
			new Date(dto.sale_date),
			dto.sale_price
		)
	}
}
