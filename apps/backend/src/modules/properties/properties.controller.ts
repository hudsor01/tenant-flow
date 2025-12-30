/**
 * Properties Controller - Core CRUD Operations
 *
 * Uses:
 * - Zod DTOs via nestjs-zod + createZodDto pattern
 * - Built-in NestJS pipes for validation
 * - Native exception handling
 * - Direct PostgreSQL RPC calls
 *
 * Related Controllers (extracted for CLAUDE.md compliance):
 * - PropertyAnalyticsController: Analytics endpoints (/properties/analytics/*)
 */

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
import { DashboardService } from '../dashboard/dashboard.service'
import { CreatePropertyDto } from './dto/create-property.dto'
import { UpdatePropertyDto } from './dto/update-property.dto'
import { MarkPropertyAsSoldDto } from './dto/mark-sold.dto'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { AppLogger } from '../../logger/app-logger.service'

@Controller('properties')
export class PropertiesController {
	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly propertyLifecycleService: PropertyLifecycleService,
		private readonly propertyBulkImportService: PropertyBulkImportService,
		private readonly dashboardService: DashboardService,
		private readonly logger: AppLogger
	) {}

	// ========================================
	// Query Endpoints
	// ========================================

	/**
	 * GET /properties
	 * Get all properties for authenticated user
	 * Built-in pipes handle all validation
	 */
	@SkipSubscriptionCheck()
	@Get()
	async findAll(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@JwtToken() token: string
	) {
		const safeLimit = Math.max(1, Math.min(limit, 50))
		const safeOffset = Math.max(0, offset)

		const data = await this.propertiesService.findAll(token, {
			search,
			limit: safeLimit,
			offset: safeOffset
		})

		return {
			data,
			total: data.length,
			limit: safeLimit,
			offset: safeOffset,
			hasMore: data.length >= safeLimit
		}
	}

	/**
	 * GET /properties/stats
	 * Get property statistics
	 * Returns aggregated property stats from dashboard service
	 * MUST BE BEFORE /:id route to avoid route conflict
	 */
	@Get('stats')
	async getStats(@JwtToken() token: string) {
		const dashboardStats = await this.dashboardService.getStats(
			undefined,
			token
		)
		return dashboardStats.properties
	}

	/**
	 * GET /properties/with-units
	 * Get all properties with their units
	 * Returns properties with units for frontend stat calculations
	 * MUST BE BEFORE /:id route to avoid route conflict
	 */
	@Get('with-units')
	async findAllWithUnits(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Request() req: AuthenticatedRequest
	) {
		const safeLimit = Math.max(1, Math.min(limit, 50))
		const safeOffset = Math.max(0, offset)
		return this.propertiesService.findAllWithUnits(req, {
			search,
			limit: safeLimit,
			offset: safeOffset
		})
	}

	/**
	 * GET /properties/:id
	 * Get single property by ID
	 * ParseUUIDPipe validates the ID format
	 */
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

	/**
	 * POST /properties
	 * Create new property
	 */
	@Post()
	async create(
		@Body() dto: CreatePropertyDto,
		@Request() req: AuthenticatedRequest
	) {
		return this.propertiesService.create(req, dto)
	}

	/**
	 * POST /properties/bulk-import
	 * Bulk import properties from CSV file
	 * Ephemeral processing: parse → validate → insert → discard file
	 */
	@Post('bulk-import')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
			limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
		})
	)
	async bulkImport(
		@UploadedFile() file: Express.Multer.File,
		@JwtToken() token: string,
		@Request() req: AuthenticatedRequest
	) {
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

	/**
	 * PUT /properties/:id
	 * Update existing property
	 */
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

	/**
	 * DELETE /properties/:id
	 * Delete property
	 */
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

	/**
	 * PUT /properties/:id/mark-sold
	 * Mark property as sold
	 */
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
