/**
 * Units Controller
 *
 * Per CLAUDE.md:
 * - Uses nestjs-zod DTOs for validation (native to NestJS ecosystem)
 * - Uses @JwtToken() custom decorator for authentication (per CLAUDE.md Backend section)
 * - Uses RLS-protected Supabase queries via service layer
 * - Global ZodValidationPipe handles validation automatically
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
	Query
} from '@nestjs/common'
import { CreateUnitDto } from './dto/create-unit.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import { UnitsService } from './units.service'

@Controller('units')
export class UnitsController {
	// Logger available if needed for debugging
	// private readonly logger = new Logger(UnitsController.name)

	constructor(private readonly unitsService: UnitsService) {}

	/**
	 * Get all units for the authenticated user
	 * Uses built-in pipes for automatic validation
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@SkipSubscriptionCheck()
	@Get()
	async findAll(
		@JwtToken() token: string,
		@Query('propertyId', new DefaultValuePipe(null))
		propertyId: string | null,
		@Query('status', new DefaultValuePipe(null)) status: string | null,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string
	) {
		// Validate enum values using native JavaScript (accept both cases)
		if (status) {
			const upperStatus = status.toUpperCase()
			if (
				!['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'].includes(upperStatus)
			) {
				throw new BadRequestException('Invalid status value')
			}
			// Normalize to uppercase for database query
			status = upperStatus
		}
		if (
			!['createdAt', 'unitNumber', 'bedrooms', 'rent', 'status'].includes(
				sortBy
			)
		) {
			throw new BadRequestException('Invalid sortBy value')
		}
		if (!['asc', 'desc'].includes(sortOrder)) {
			throw new BadRequestException('Invalid sortOrder value')
		}

		// ✅ RLS: Pass JWT token to service layer
		return this.unitsService.findAll(token, {
			propertyId,
			status,
			search,
			limit,
			offset,
			sortBy,
			sortOrder
		})
	}

	/**
	 * Get unit statistics
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('stats')
	async getStats(@JwtToken() token: string) {
		return this.unitsService.getStats(token)
	}

	/**
	 * Get units by property
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get('by-property/:propertyId')
	async findByProperty(
		@JwtToken() token: string,
		@Param('propertyId', ParseUUIDPipe) propertyId: string
	) {
		return this.unitsService.findByProperty(token, propertyId)
	}

	/**
	 * Get single unit by ID
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Get(':id')
	async findOne(
		@JwtToken() token: string,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const unit = await this.unitsService.findOne(token, id)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Create new unit
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Post()
	async create(
		@JwtToken() token: string,
		@Body() createUnitDto: CreateUnitDto
	) {
		return this.unitsService.create(token, createUnitDto)
	}

	/**
	 * Update existing unit
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Put(':id')
	async update(
		@JwtToken() token: string,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUnitDto: UpdateUnitDto
	) {
		//Pass version for optimistic locking
		const expectedVersion = (updateUnitDto as { version?: number }).version
		const unit = await this.unitsService.update(
			token,
			id,
			updateUnitDto,
			expectedVersion
		)
		if (!unit) {
			throw new NotFoundException('Unit not found')
		}
		return unit
	}

	/**
	 * Delete unit
	 * ✅ RLS COMPLIANT: Uses @JwtToken() decorator
	 */
	@Delete(':id')
	async remove(
		@JwtToken() token: string,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.unitsService.remove(token, id)
		return { message: 'Unit deleted successfully' }
	}
}
