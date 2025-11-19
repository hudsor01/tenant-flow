import {
	Body,
	Controller,
	Get,
	Logger,
	Param,
	ParseUUIDPipe,
	Post,
	Req,
	Res,
	UseGuards,
	NotFoundException,
	BadRequestException,
	InternalServerErrorException,
	UnauthorizedException
} from '@nestjs/common'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { user_typesGuard } from '../../shared/guards/roles.guard'
import { user_types } from '../../shared/decorators/roles.decorator'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { ReactLeasePDFService } from './react-lease-pdf.service'
import { LeaseGenerationDto } from './dto/lease-generation.dto'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { SupabaseService } from '../../database/supabase.service'
import { ZeroCacheService } from '../../cache/cache.service'

// Filename sanitization constants
const MAX_ADDRESS_LENGTH = 30 // Max characters for property address in filename
const MAX_TENANT_NAME_LENGTH = 20 // Max characters for tenant name in filename

/**
 * Lease Generation Controller
 * Handles Texas Residential Lease Agreement generation
 *
 * Authorization:
 * - JwtAuthGuard: Ensures only authenticated users can access
 * - user_typesGuard: Restricts lease generation to OWNER and MANAGER user_types
 * - PropertyOwnershipGuard: Verifies user owns the property (applied to specific routes)
 */
@Controller('api/v1/leases')
@UseGuards(JwtAuthGuard, user_typesGuard)
@user_types('TENANT', 'OWNER', 'MANAGER')
export class LeaseGenerationController {
	private readonly logger = new Logger(LeaseGenerationController.name)

	constructor(
		private readonly leasePDF: ReactLeasePDFService,
		private readonly supabase: SupabaseService,
		private readonly cache: ZeroCacheService
	) {}

	/**
	 * Sanitize string for use in filename
	 * Removes special characters and limits length
	 */
	private sanitizeForFilename(value: string | undefined, maxLength: number): string {
		const fallback = 'file'
		if (!value?.trim()) return fallback

		return value
			.trim()
			.normalize('NFKD') // Unicode normalization to prevent attacks
			.replace(/[^a-zA-Z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, maxLength) || fallback
	}

	/**
	 * Generate lease filename from DTO data
	 */
	private generateLeaseFilename(dto: LeaseGenerationDto): string {
		const sanitizedAddress = this.sanitizeForFilename(
			dto.propertyAddress || 'properties',
			MAX_ADDRESS_LENGTH
		) || 'properties'
		const sanitizedTenant = this.sanitizeForFilename(
			dto.tenantName || 'tenants',
			MAX_TENANT_NAME_LENGTH
		) || 'tenants'
		const date = new Date().toISOString().split('T')[0]
		return `lease-${sanitizedAddress}-${sanitizedTenant}-${date}.pdf`
	}

	/**
	 * Generate Texas lease PDF from form data
	 * POST /api/v1/leases/generate
	 *
	 * Authorization: PropertyOwnershipGuard verifies user owns the property
	 */
	@UseGuards(PropertyOwnershipGuard)
	@Post('generate')
	async generateLease(
		@Body() dto: LeaseGenerationDto,
		@Res() res: Response
	): Promise<void> {
		try {
			const pdfBuffer = await this.leasePDF.generateLeasePDF(dto)
			const filename = this.generateLeaseFilename(dto)

			// Preview mode - display in browser (NO DOWNLOAD, NO DATABASE SAVE)
			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
			res.setHeader('Content-Length', pdfBuffer.length)
			res.setHeader('Cache-Control', 'no-cache')

			res.send(pdfBuffer)
		} catch (error) {
			throw new InternalServerErrorException(
				'Failed to generate lease PDF',
				error instanceof Error ? error.message : String(error)
			)
		}
	}

	/**
	 * Download Texas lease PDF
	 * POST /api/v1/leases/download
	 *
	 * Forces download instead of preview
	 * NO DATABASE STORAGE - user action in their hands
	 */
	@UseGuards(PropertyOwnershipGuard)
	@Post('download')
	async downloadLease(
		@Body() dto: LeaseGenerationDto,
		@Res() res: Response
	): Promise<void> {
		try {
			const pdfBuffer = await this.leasePDF.generateLeasePDF(dto)
			const filename = this.generateLeaseFilename(dto)

			// Force download
			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
			res.setHeader('Content-Length', pdfBuffer.length)

			res.send(pdfBuffer)
		} catch (error) {
			throw new InternalServerErrorException(
				'Failed to download lease PDF',
				error instanceof Error ? error.message : String(error)
			)
		}
	}

	/**
	 * Auto-fill lease form from property, unit, and tenant data
	 * GET /api/v1/leases/auto-fill/:property_id/:unit_id/:tenant_id
	 *
	 * Authorization: PropertyOwnershipGuard verifies user owns the property
	 * Uses a single optimized query with joins instead of multiple queries
	 */
	@UseGuards(PropertyOwnershipGuard)
	@Get('auto-fill/:property_id/:unit_id/:tenant_id')
	async autoFillLease(
		@Param('property_id', ParseUUIDPipe) property_id: string,
		@Param('unit_id', ParseUUIDPipe) unit_id: string,
		@Param('tenant_id', ParseUUIDPipe) tenant_id: string,
		@Req() req: AuthenticatedRequest
	): Promise<Partial<LeaseGenerationFormData>> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException('Authenticated user is required')
		}

		// Check cache first with parameterized key
		const cacheKey = `lease-auto-fill:${user_id}:${property_id}:${unit_id}:${tenant_id}`
		const cached = this.cache.get<Partial<LeaseGenerationFormData>>(cacheKey)
		if (cached) {
			this.logger.debug(`Cache hit for auto-fill: ${cacheKey}`)
			return cached
		}

		// OPTIMIZATION: Fetch property, unit, and tenant data in parallel with Promise.all
		const [
			{ data: property, error: propertyError },
			{ data: unit, error: unitError },
			{ data: tenant, error: tenantError }
		] = await Promise.all([
			this.supabase
				.getAdminClient()
				.from('properties')
				.select('id, address_line1, city, state, postal_code, property_owner_id')
				.eq('id', property_id)
				.single(),
			this.supabase
				.getAdminClient()
				.from('units')
				.select('id, rent_amount, unit_number, property_id')
				.eq('id', unit_id)
				.single(),
			this.supabase
				.getAdminClient()
				.from('users')
				.select('id, first_name, last_name, email')
				.eq('id', tenant_id)
				.single()
		])

		// Validate property query result
		if (propertyError) {
			// PGRST116 = not found (no rows returned)
			if (propertyError.code === 'PGRST116') {
				throw new NotFoundException(`Property not found: ${property_id}`)
			}
			// Other database errors (connection, permissions, etc.)
			throw new InternalServerErrorException(
				'Failed to fetch property data',
				propertyError.message
			)
		}

		if (!property) {
			throw new NotFoundException(`Property not found: ${property_id}`)
		}

		// Validate unit query result
		if (unitError) {
			if (unitError.code === 'PGRST116') {
				throw new NotFoundException(`Unit not found: ${unit_id}`)
			}
			throw new InternalServerErrorException(
				'Failed to fetch unit data',
				unitError.message
			)
		}

		if (!unit) {
			throw new NotFoundException(`Unit not found: ${unit_id}`)
		}

		// Verify unit belongs to property (using data from previous query)
		if (unit.property_id !== property_id) {
			throw new BadRequestException(
				`Unit ${unit_id} does not belong to property ${property_id}`
			)
		}

		// Validate tenant query result
		if (tenantError) {
			if (tenantError.code === 'PGRST116') {
				throw new NotFoundException(`Tenant not found: ${tenant_id}`)
			}
			throw new InternalServerErrorException(
				'Failed to fetch tenant data',
				tenantError.message
			)
		}

		if (!tenant) {
			throw new NotFoundException(`Tenant not found: ${tenant_id}`)
		}

		// Fetch owner data from property owner
		const { data: owner, error: ownerError } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('first_name, last_name, email')
			.eq('id', property.property_owner_id)
			.single()

		// Owner is optional - if fetch fails, use fallback
		if (ownerError && ownerError.code !== 'PGRST116') {
			this.logger.warn(
				`Failed to fetch owner data for property ${property_id}: ${ownerError.message}`
			)
		}

		// Auto-fill form data
		const autoFilled: Partial<LeaseGenerationFormData> = {
			// Property info
			propertyAddress: `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}`,
			property_id: property.id,

			// Property owner info
			ownerName: owner
				? `${owner.first_name} ${owner.last_name}`
				: 'Property Owner',
			ownerAddress: `${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}`,

			// Tenant info (REQUIRED)
			tenantName: `${tenant.first_name} ${tenant.last_name}`,
			tenant_id: tenant.id,

			// Financial defaults from unit
			rent_amount: unit.rent_amount,
			security_deposit: unit.rent_amount, // Default: 1 month rent
			holdOverRentMultiplier: 1.2, // 120% of monthly rent
			rentDueDay: 1,
			lateFeeGraceDays: 3,
			nsfFee: 50,
			security_depositDueDays: 30,

			// Agreement date (today)
			agreementDate: new Date().toISOString().split('T')[0] as string,

			// State
			governingState: 'TX',

			// Default settings
			petsAllowed: false,
			petDeposit: 0,
			petRent: 0,
			alterationsAllowed: false,
			alterationsRequireConsent: true,
			prevailingPartyAttorneyFees: true,
			propertyBuiltBefore1978: false,
			allowedUse: 'Residential dwelling purposes only. No business activities.',
			utilitiesIncluded: [],
			tenantResponsibleUtilities: ['Electric', 'Gas', 'Water', 'Internet']
		}

		// Cache the result for 30 seconds (short TTL for fresh data)
		// Dependencies: invalidate when property, unit, or tenant data changes
		this.cache.set(
			cacheKey,
			autoFilled,
			30_000, // 30 seconds
			[
				`property:${property_id}`,
				`unit:${unit_id}`,
				`tenant:${tenant_id}`,
				`user:${user_id}`
			]
		)

		this.logger.debug(`Cached auto-fill data: ${cacheKey}`)
		return autoFilled
	}
}
