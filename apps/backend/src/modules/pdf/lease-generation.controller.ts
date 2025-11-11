import {
	Body,
	Controller,
	Get,
	Logger,
	Param,
	ParseUUIDPipe,
	Post,
	Res,
	UseGuards,
	NotFoundException,
	BadRequestException,
	InternalServerErrorException
} from '@nestjs/common'
import type { Response } from 'express'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { RolesGuard } from '../../shared/guards/roles.guard'
import { Roles } from '../../shared/decorators/roles.decorator'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
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
 * - RolesGuard: Restricts lease generation to OWNER and MANAGER roles
 * - PropertyOwnershipGuard: Verifies user owns the property (applied to specific routes)
 */
@Controller('api/v1/leases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
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
			dto.propertyAddress || 'property',
			MAX_ADDRESS_LENGTH
		) || 'property'
		const sanitizedTenant = this.sanitizeForFilename(
			dto.tenantName || 'tenant',
			MAX_TENANT_NAME_LENGTH
		) || 'tenant'
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
	 * GET /api/v1/leases/auto-fill/:propertyId/:unitId/:tenantId
	 *
	 * Authorization: PropertyOwnershipGuard verifies user owns the property
	 * Uses a single optimized query with joins instead of multiple queries
	 */
	@UseGuards(PropertyOwnershipGuard)
	@Get('auto-fill/:propertyId/:unitId/:tenantId')
	async autoFillLease(
		@Param('propertyId', ParseUUIDPipe) propertyId: string,
		@Param('unitId', ParseUUIDPipe) unitId: string,
		@Param('tenantId', ParseUUIDPipe) tenantId: string
	): Promise<Partial<LeaseGenerationFormData>> {
		// Check cache first with parameterized key
		const cacheKey = `lease-auto-fill:${propertyId}:${unitId}:${tenantId}`
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
				.from('property')
				.select('id, address, city, state, zipCode, ownerId')
				.eq('id', propertyId)
				.single(),
			this.supabase
				.getAdminClient()
				.from('unit')
				.select('id, rent, unitNumber, propertyId')
				.eq('id', unitId)
				.single(),
			this.supabase
				.getAdminClient()
				.from('users')
				.select('id, firstName, lastName, email')
				.eq('id', tenantId)
				.single()
		])

		// Validate property query result
		if (propertyError) {
			// PGRST116 = not found (no rows returned)
			if (propertyError.code === 'PGRST116') {
				throw new NotFoundException(`Property not found: ${propertyId}`)
			}
			// Other database errors (connection, permissions, etc.)
			throw new InternalServerErrorException(
				'Failed to fetch property data',
				propertyError.message
			)
		}

		if (!property) {
			throw new NotFoundException(`Property not found: ${propertyId}`)
		}

		// Validate unit query result
		if (unitError) {
			if (unitError.code === 'PGRST116') {
				throw new NotFoundException(`Unit not found: ${unitId}`)
			}
			throw new InternalServerErrorException(
				'Failed to fetch unit data',
				unitError.message
			)
		}

		if (!unit) {
			throw new NotFoundException(`Unit not found: ${unitId}`)
		}

		// Verify unit belongs to property (using data from previous query)
		if (unit.propertyId !== propertyId) {
			throw new BadRequestException(
				`Unit ${unitId} does not belong to property ${propertyId}`
			)
		}

		// Validate tenant query result
		if (tenantError) {
			if (tenantError.code === 'PGRST116') {
				throw new NotFoundException(`Tenant not found: ${tenantId}`)
			}
			throw new InternalServerErrorException(
				'Failed to fetch tenant data',
				tenantError.message
			)
		}

		if (!tenant) {
			throw new NotFoundException(`Tenant not found: ${tenantId}`)
		}

		// Fetch owner data from property owner
		const { data: owner, error: ownerError } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('firstName, lastName, email')
			.eq('id', property.ownerId)
			.single()

		// Owner is optional - if fetch fails, use fallback
		if (ownerError && ownerError.code !== 'PGRST116') {
			this.logger.warn(
				`Failed to fetch owner data for property ${propertyId}: ${ownerError.message}`
			)
		}

		// Auto-fill form data
		const autoFilled: Partial<LeaseGenerationFormData> = {
			// Property info
			propertyAddress: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
			propertyId: property.id,

			// Property owner info
			ownerName: owner
				? `${owner.firstName} ${owner.lastName}`
				: 'Property Owner',
			ownerAddress: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,

			// Tenant info (REQUIRED)
			tenantName: `${tenant.firstName} ${tenant.lastName}`,
			tenantId: tenant.id,

			// Financial defaults from unit
			monthlyRent: unit.rent,
			securityDeposit: unit.rent, // Default: 1 month rent
			holdOverRentMultiplier: 1.2, // 120% of monthly rent
			rentDueDay: 1,
			lateFeeGraceDays: 3,
			nsfFee: 50,
			securityDepositDueDays: 30,

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
			[`property:${propertyId}`, `unit:${unitId}`, `user:${tenantId}`]
		)

		this.logger.debug(`Cached auto-fill data: ${cacheKey}`)
		return autoFilled
	}
}
