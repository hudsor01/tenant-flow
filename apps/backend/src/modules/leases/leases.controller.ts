/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS

 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
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
	Req
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { LeasesService } from './leases.service'
import { LeaseFinancialService } from './lease-financial.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { LeaseSignatureService } from './lease-signature.service'
import type { CreateLeaseDto } from './dto/create-lease.dto'
import type { UpdateLeaseDto } from './dto/update-lease.dto'

@Controller('leases')
export class LeasesController {
	constructor(
		private readonly leasesService: LeasesService,
		private readonly financialService: LeaseFinancialService,
		private readonly lifecycleService: LeaseLifecycleService,
		private readonly signatureService: LeaseSignatureService
	) {}

	@Get()
	async findAll(
		@JwtToken() token: string,
		@Query('tenant_id') tenant_id?: string,
		@Query('unit_id') unit_id?: string,
		@Query('property_id') property_id?: string,
		@Query('status') status?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('created_at')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
	) {
		// Validate UUIDs if provided
		if (
			tenant_id &&
			!tenant_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid tenant ID')
		}
		if (
			unit_id &&
			!unit_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid unit ID')
		}
		if (
			property_id &&
			!property_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate status enum
		if (
			status &&
			!['draft', 'active', 'expired', 'terminated'].includes(status)
		) {
			throw new BadRequestException('Invalid lease status')
		}

		// Validate limits
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		const data = await this.leasesService.findAll(token, {
			tenant_id,
			unit_id,
			property_id,
			status,
			limit,
			offset,
			sortBy,
			sortOrder
		})

		// Return PaginatedResponse format expected by frontend
		// Service already returns { data, total, limit, offset }, just add hasMore
		return {
			...data,
			hasMore: data.data.length >= data.limit
		}
	}

	@Get('stats')
	async getStats(@JwtToken() token: string) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getStats(token)
	}

	@Get('analytics/performance')
	async getLeasePerformanceAnalytics(
		@JwtToken() token: string,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('90d')) timeframe?: string
	) {
		// Validate UUIDs if provided
		if (
			lease_id &&
			!lease_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (
			property_id &&
			!property_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['30d', '90d', '6m', '1y'].includes(timeframe ?? '90d')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 30d, 90d, 6m, 1y'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(lease_id ? { lease_id } : {}),
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '90d'
		})
	}

	@Get('analytics/duration')
	async getLeaseDurationAnalytics(
		@JwtToken() token: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('yearly')) period?: string
	) {
		// Validate property_id if provided
		if (
			property_id &&
			!property_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['monthly', 'quarterly', 'yearly'].includes(period ?? 'yearly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: monthly, quarterly, yearly'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(property_id ? { property_id } : {}),
			timeframe: '90d',
			period: period ?? 'yearly'
		})
	}

	@Get('analytics/turnover')
	async getLeaseTurnoverAnalytics(
		@JwtToken() token: string,
		@Query('property_id') property_id?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate property_id if provided
		if (
			property_id &&
			!property_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['6m', '12m', '24m', '36m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 6m, 12m, 24m, 36m'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(property_id ? { property_id } : {}),
			timeframe: timeframe ?? '12m'
		})
	}

	@Get('analytics/revenue')
	async getLeaseRevenueAnalytics(
		@JwtToken() token: string,
		@Query('lease_id') lease_id?: string,
		@Query('property_id') property_id?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate UUIDs if provided
		if (
			lease_id &&
			!lease_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid lease ID')
		}
		if (
			property_id &&
			!property_id.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['weekly', 'monthly', 'quarterly'].includes(period ?? 'monthly')) {
			throw new BadRequestException(
				'Invalid period. Must be one of: weekly, monthly, quarterly'
			)
		}

		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getAnalytics(token, {
			...(lease_id ? { lease_id } : {}),
			...(property_id ? { property_id } : {}),
			timeframe: '90d',
			period: period ?? 'monthly'
		})
	}

	@Get('expiring')
	async getExpiring(
		@JwtToken() token: string,
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	) {
		if (days && (days < 1 || days > 365)) {
			throw new BadRequestException('Days must be between 1 and 365')
		}
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.financialService.getExpiring(token, days ?? 30)
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		const lease = await this.leasesService.findOne(token, id)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Post()
	async create(@Body() dto: CreateLeaseDto, @JwtToken() token: string) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.leasesService.create(token, dto)
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateLeaseDto,
		@JwtToken() token: string
	) {
		//Pass version for optimistic locking
		const lease = await this.leasesService.update(
			token,
			id,
			dto
		)
		if (!lease) {
			throw new NotFoundException('Lease not found')
		}
		return lease
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		await this.leasesService.remove(token, id)
		return { message: 'Lease deleted successfully' }
	}

	@Post(':id/renew')
	async renew(
		@Param('id', ParseUUIDPipe) id: string,
		@Body('end_date') end_date: string,
		@JwtToken() token: string
	) {
		// Validate date format
		if (!end_date || !end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
			throw new BadRequestException('Invalid date format (YYYY-MM-DD required)')
		}
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.lifecycleService.renew(token, id, end_date)
	}

	@Post(':id/terminate')
	async terminate(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string,
		@Body('reason') reason?: string
	) {
		// RLS PATTERN: Pass JWT token to service for RLS-protected queries
		return this.lifecycleService.terminate(
			token,
			id,
			new Date().toISOString(),
			reason
		)
	}

	// ============================================================
	// LEASE SIGNATURE WORKFLOW ENDPOINTS
	// ============================================================

	/**
	 * Owner sends lease for signature (draft -> pending_signature)
	 * If templateId is provided and DocuSeal is configured, creates e-signature request
	 */
	@Post(':id/send-for-signature')
	@Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 sends per hour
	async sendForSignature(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body() body?: { message?: string; templateId?: number }
	) {
		await this.signatureService.sendForSignature(req.user.id, id, {
			message: body?.message,
			templateId: body?.templateId
		})
		return { success: true }
	}

	/**
	 * Owner signs the lease
	 */
	@Post(':id/sign/owner')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 signature attempts per hour
	async signAsOwner(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signatureIp = req.ip || 'unknown'
		await this.signatureService.signLeaseAsOwner(req.user.id, id, signatureIp)
		return { success: true }
	}

	/**
	 * Tenant signs the lease
	 */
	@Post(':id/sign/tenant')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 signature attempts per hour
	async signAsTenant(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signatureIp = req.ip || 'unknown'
		await this.signatureService.signLeaseAsTenant(req.user.id, id, signatureIp)
		return { success: true }
	}

	/**
	 * Get signature status for a lease
	 * Authorization: Only owner or assigned tenant can view
	 */
	@Get(':id/signature-status')
	@Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute (polling)
	async getSignatureStatus(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		return this.signatureService.getSignatureStatus(id, req.user.id)
	}

	/**
	 * Get DocuSeal signing URL for the current user
	 * Returns embed URL for e-signature if DocuSeal submission exists
	 */
	@Get(':id/signing-url')
	@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
	async getSigningUrl(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const signingUrl = await this.signatureService.getSigningUrl(id, req.user.id)
		return { signing_url: signingUrl }
	}

	/**
	 * Cancel/revoke signature request
	 * Reverts lease to draft status and archives DocuSeal submission
	 */
	@Post(':id/cancel-signature')
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 cancellations per hour
	async cancelSignatureRequest(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		await this.signatureService.cancelSignatureRequest(req.user.id, id)
		return { success: true }
	}
}
