/**
 * Properties Controller - Ultra-Native Implementation
 *
 * Uses:
 * - Express request validation (no DTOs)
 * - Built-in NestJS pipes for validation
 * - Native exception handling
 * - Direct PostgreSQL RPC calls
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
	SetMetadata,
	UploadedFile,
	UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '@repo/shared/types/backend-domain'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { PropertiesService } from './properties.service'

/**
 * No base classes, no abstraction, just clean endpoints
 */
@Controller('properties')
export class PropertiesController {
	constructor(private readonly propertiesService: PropertiesService) {}

	/**
	 * Get all properties for authenticated user
	 * Built-in pipes handle all validation
	 */
	@SkipSubscriptionCheck()
	@Get()
	async findAll(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Request() req: AuthenticatedRequest
	) {
		// Authentication is required for this endpoint
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		// Clamp limit/offset to safe bounds
		const safeLimit = Math.max(1, Math.min(limit, 50))
		const safeOffset = Math.max(0, offset)
		const userId = req.user.id
		return this.propertiesService.findAll(userId, {
			search,
			limit: safeLimit,
			offset: safeOffset
		})
	}

	/**
	 * Get property statistics
	 * Direct RPC call for aggregated data
	 * MUST BE BEFORE /:id route to avoid route conflict
	 */
	@Get('stats')
	async getStats(@Request() req: AuthenticatedRequest) {
		// Authentication is required for this endpoint
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		const userId = req.user.id
		return this.propertiesService.getStats(userId)
	}

	/**
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
		const userId = req.user.id

		const properties = await this.propertiesService.findAllWithUnits(userId, {
			search,
			limit: safeLimit,
			offset: safeOffset
		})

		// Return paginated response for consistency with other endpoints
		return {
			data: properties,
			total: properties.length, // This should ideally come from the service with proper pagination
			limit: safeLimit,
			offset: safeOffset
		}
	}

	/**
	 * Get single property by ID
	 * ParseUUIDPipe validates the ID format
	 */
	@Get(':id')
	@SetMetadata('isPublic', true)
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user.id

		const property = await this.propertiesService.findOne(userId, id)
		if (!property) {
			throw new NotFoundException('Property not found')
		}
		return property
	}

	/**
	 * Create new property
	 * ✅ October 2025: Zod schema validation with shared validation rules
	 */
	@Post()
	async create(
		@Body() createPropertyRequest: CreatePropertyRequest,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user.id

		return this.propertiesService.create(userId, createPropertyRequest)
	}

	/**
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
		@Request() req: AuthenticatedRequest
	) {
		if (!file) {
			throw new BadRequestException('No file uploaded')
		}

		// Validate file type (CSV only)
		const allowedMimeTypes = [
			'text/csv',
			'application/csv',
			'text/plain' // Some browsers send CSV as text/plain
		]
		if (
			!allowedMimeTypes.includes(file.mimetype) &&
			!file.originalname?.endsWith('.csv')
		) {
			throw new BadRequestException(
				'Invalid file type. Only CSV files (.csv) are allowed'
			)
		}

		const userId = req.user.id
		return this.propertiesService.bulkImport(userId, file.buffer)
	}

	/**
	 * Update existing property
	 * Combination of UUID validation and JSON Schema
	 */
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updatePropertyRequest: UpdatePropertyRequest,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user.id

		// 🔐 BUG FIX #2: Pass version for optimistic locking
		const expectedVersion = updatePropertyRequest.version
		const property = await this.propertiesService.update(
			userId,
			id,
			updatePropertyRequest,
			expectedVersion
		)
		if (!property) {
			throw new NotFoundException('Property not found')
		}
		return property
	}

	/**
	 * Delete property
	 * Simple and direct with built-in validation
	 */
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user?.id

		await this.propertiesService.remove(userId, id)
		return { message: 'Property deleted successfully' }
	}

	/**
	 * Get per-property analytics and performance metrics
	 * Returns detailed metrics for each property
	 */
	@Get('analytics/performance')
	async getPropertyPerformanceAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('propertyId', new ParseUUIDPipe({ optional: true }))
		propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('30d')) timeframe?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
	) {
		// Validate timeframe
		if (!['7d', '30d', '90d', '1y'].includes(timeframe ?? '30d')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 7d, 30d, 90d, 1y'
			)
		}

		const userId = req.user.id

		return this.propertiesService.getPropertyPerformanceAnalytics(userId, {
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '30d',
			...(limit !== undefined ? { limit } : {})
		})
	}

	/**
	 * Get property occupancy trends and analytics
	 * Tracks occupancy rates over time per property
	 */
	@Get('analytics/occupancy')
	async getPropertyOccupancyAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('propertyId', new ParseUUIDPipe({ optional: true }))
		propertyId?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate period
		if (
			!['daily', 'weekly', 'monthly', 'yearly'].includes(period ?? 'monthly')
		) {
			throw new BadRequestException(
				'Invalid period. Must be one of: daily, weekly, monthly, yearly'
			)
		}

		const userId = req.user.id

		return this.propertiesService.getPropertyOccupancyAnalytics(userId, {
			...(propertyId ? { propertyId } : {}),
			period: period ?? 'monthly'
		})
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profitability per property
	 */
	@Get('analytics/financial')
	async getPropertyFinancialAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('propertyId', new ParseUUIDPipe({ optional: true }))
		propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate timeframe
		if (!['3m', '6m', '12m', '24m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 3m, 6m, 12m, 24m'
			)
		}

		const userId = req.user.id

		return this.propertiesService.getPropertyFinancialAnalytics(userId, {
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	/**
	 * Get property maintenance analytics
	 * Maintenance costs, frequency, and trends per property
	 */
	@Get('analytics/maintenance')
	async getPropertyMaintenanceAnalytics(
		@Request() req: AuthenticatedRequest,
		@Query('propertyId', new ParseUUIDPipe({ optional: true }))
		propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('6m')) timeframe?: string
	) {
		// Validate timeframe
		if (!['1m', '3m', '6m', '12m'].includes(timeframe ?? '6m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 1m, 3m, 6m, 12m'
			)
		}

		const userId = req.user.id

		return this.propertiesService.getPropertyMaintenanceAnalytics(userId, {
			...(propertyId ? { propertyId } : {}),
			timeframe: timeframe ?? '6m'
		})
	}

	/**
	 * Mark property as sold (7-year retention compliance)
	 * Updates status to SOLD with required date_sold and sale_price
	 */
	/**
	 * Upload property image
	 * Stores image in property-images bucket and records in property_images table
	 */
	@Post(':id/images')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
			limits: { fileSize: 5 * 1024 * 1024 } // 5MB max (optimize for storage)
		})
	)
	async uploadImage(
		@Param('id', ParseUUIDPipe) propertyId: string,
		@UploadedFile() file: Express.Multer.File,
		@Body('isPrimary') isPrimary: string,
		@Body('caption') caption: string,
		@Request() req: AuthenticatedRequest
	) {
		if (!file) {
			throw new BadRequestException('No file uploaded')
		}

		const userId = req.user.id
		const isPrimaryBool = isPrimary === 'true'

		return this.propertiesService.uploadPropertyImage(
			userId,
			propertyId,
			file,
			isPrimaryBool,
			caption
		)
	}

	/**
	 * Get all images for a property
	 */
	@Get(':id/images')
	async getImages(
		@Param('id', ParseUUIDPipe) propertyId: string,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user.id
		return this.propertiesService.getPropertyImages(userId, propertyId)
	}

	/**
	 * Delete property image
	 */
	@Delete('images/:imageId')
	async deleteImage(
		@Param('imageId', ParseUUIDPipe) imageId: string,
		@Request() req: AuthenticatedRequest
	) {
		const userId = req.user.id
		await this.propertiesService.deletePropertyImage(userId, imageId)
		return { message: 'Image deleted successfully' }
	}

	@Put(':id/mark-sold')
	async markPropertyAsSold(
		@Param('id', ParseUUIDPipe) propertyId: string,
		@Body() body: { dateSold: string; salePrice: number; saleNotes?: string },
		@Request() req: AuthenticatedRequest
	) {
		if (!req.user?.id) {
			throw new BadRequestException('Authentication required')
		}

		// Validate sale price
		if (!body.salePrice || body.salePrice <= 0) {
			throw new BadRequestException('Sale price must be greater than $0')
		}

		// Validate date sold
		const dateSold = new Date(body.dateSold)
		if (isNaN(dateSold.getTime())) {
			throw new BadRequestException('Invalid sale date format')
		}

		// Date sold cannot be in the future
		if (dateSold > new Date()) {
			throw new BadRequestException('Sale date cannot be in the future')
		}

		return this.propertiesService.markAsSold(
			propertyId,
			req.user.id,
			dateSold,
			body.salePrice,
			body.saleNotes
		)
	}
}
