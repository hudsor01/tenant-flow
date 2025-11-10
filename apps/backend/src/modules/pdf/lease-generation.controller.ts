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
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import { TexasLeasePDFService } from './texas-lease-pdf.service'
import { LeaseGenerationDto } from './dto/lease-generation.dto'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import { SupabaseService } from '../../database/supabase.service'

// Filename sanitization constants
const MAX_ADDRESS_LENGTH = 30 // Max characters for property address in filename
const MAX_TENANT_NAME_LENGTH = 20 // Max characters for tenant name in filename

/**
 * Lease Generation Controller
 * Handles Texas Residential Lease Agreement generation
 *
 * Authorization: JwtAuthGuard ensures only authenticated users can access
 */
@Controller('api/v1/leases')
@UseGuards(JwtAuthGuard)
export class LeaseGenerationController {
	private readonly logger = new Logger(LeaseGenerationController.name)

	constructor(
		private readonly texasLeasePDF: TexasLeasePDFService,
		private readonly supabase: SupabaseService
	) {}



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
			const pdfBuffer = await this.texasLeasePDF.generateLeasePDF(dto)

			// Generate descriptive filename with proper sanitization
			const sanitizedAddress = (dto.propertyAddress || 'property')
				.replace(/[^a-zA-Z0-9]/g, '-')
				.replace(/-+/g, '-') // Replace consecutive hyphens with single hyphen
				.replace(/^-|-$/g, '') // Remove leading/trailing hyphens
				.slice(0, MAX_ADDRESS_LENGTH)
			const sanitizedTenant = (dto.tenantName || 'tenant')
				.replace(/[^a-zA-Z0-9]/g, '-')
				.replace(/-+/g, '-') // Replace consecutive hyphens with single hyphen
				.replace(/^-|-$/g, '') // Remove leading/trailing hyphens
				.slice(0, MAX_TENANT_NAME_LENGTH)
			const date = new Date().toISOString().split('T')[0]
			const filename = `lease-${sanitizedAddress}-${sanitizedTenant}-${date}.pdf`

			// Set response headers for PDF download
			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
			res.setHeader('Content-Length', pdfBuffer.length)

			// NestJS compression middleware will automatically compress if enabled
			res.send(pdfBuffer)
		} catch (error) {
			throw new InternalServerErrorException(
				'Failed to generate lease PDF',
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
	// NOTE: Caching disabled - @CacheKey doesn't support per-property/per-user keys
	// User-specific data cannot use global cache without exposing data across users
	// Each property/unit/tenant combination would need unique cache key: lease-auto-fill:{propertyId}:{unitId}:{tenantId}
	async autoFillLease(
		@Param('propertyId', ParseUUIDPipe) propertyId: string,
		@Param('unitId', ParseUUIDPipe) unitId: string,
		@Param('tenantId', ParseUUIDPipe) tenantId: string
	): Promise<Partial<LeaseGenerationFormData>> {

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

		return autoFilled
	}
}
