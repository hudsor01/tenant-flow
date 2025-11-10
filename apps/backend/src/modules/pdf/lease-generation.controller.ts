import {
	Body,
	Controller,
	Get,
	Param,
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
import { validate as isUUID } from 'uuid'

/**
 * Lease Generation Controller
 * Handles Texas Residential Lease Agreement generation
 *
 * Authorization: JwtAuthGuard ensures only authenticated users can access
 */
@Controller('api/v1/leases')
@UseGuards(JwtAuthGuard)
export class LeaseGenerationController {
	constructor(
		private readonly texasLeasePDF: TexasLeasePDFService,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Validate UUID format for ID parameters
	 */
	private validateUUID(id: string, paramName: string): void {
		if (!isUUID(id)) {
			throw new BadRequestException(`Invalid ${paramName}: must be a valid UUID`)
		}
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
			const pdfBuffer = await this.texasLeasePDF.generateLeasePDF(dto)

			// Generate descriptive filename
			const sanitizedAddress = (dto.propertyAddress || 'property')
				.replace(/[^a-zA-Z0-9]/g, '-')
				.slice(0, 30)
			const sanitizedTenant = (dto.tenantName || 'tenant')
				.replace(/[^a-zA-Z0-9]/g, '-')
				.slice(0, 20)
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
	async autoFillLease(
		@Param('propertyId') propertyId: string,
		@Param('unitId') unitId: string,
		@Param('tenantId') tenantId: string
	): Promise<Partial<LeaseGenerationFormData>> {
		// Validate UUID format
		this.validateUUID(propertyId, 'propertyId')
		this.validateUUID(unitId, 'unitId')
		this.validateUUID(tenantId, 'tenantId')

		// Fetch property data
		const { data: property, error: propertyError } = await this.supabase
			.getAdminClient()
			.from('property')
			.select('id, address, city, state, zipCode, ownerId')
			.eq('id', propertyId)
			.single()

		if (propertyError || !property) {
			throw new NotFoundException(`Property not found: ${propertyId}`)
		}

		// Fetch unit data for rent amount
		const { data: unit, error: unitError } = await this.supabase
			.getAdminClient()
			.from('unit')
			.select('id, rent, unitNumber, propertyId')
			.eq('id', unitId)
			.single()

		if (unitError || !unit) {
			throw new NotFoundException(`Unit not found: ${unitId}`)
		}

		// Verify unit belongs to property (using data from previous query)
		if (unit.propertyId !== propertyId) {
			throw new BadRequestException(
				`Unit ${unitId} does not belong to property ${propertyId}`
			)
		}

		// Fetch tenant data - REQUIRED for lease generation
		const { data: tenant, error: tenantError } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id, firstName, lastName, email')
			.eq('id', tenantId)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException(`Tenant not found: ${tenantId}`)
		}

		// Fetch landlord data from property owner
		const { data: landlord } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('firstName, lastName, email')
			.eq('id', property.ownerId)
			.single()

		// Auto-fill form data
		const autoFilled: Partial<LeaseGenerationFormData> = {
			// Property info
			propertyAddress: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
			propertyId: property.id,

			// Property owner info
			ownerName: landlord
				? `${landlord.firstName} ${landlord.lastName}`
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
