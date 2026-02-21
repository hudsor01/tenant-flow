/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct service calls.
 * FORBIDDEN: Custom decorators, validation layers, middleware
 */

import {
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Request,
	UnauthorizedException,
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { VendorsService } from './vendors.service'
import { CreateVendorDto } from './dto/create-vendor.dto'
import { UpdateVendorDto } from './dto/update-vendor.dto'

@ApiTags('Vendors')
@ApiBearerAuth('supabase-auth')
@Controller('vendors')
export class VendorsController {
	constructor(private readonly vendorsService: VendorsService) {}

	// Static routes MUST come before dynamic :id routes (NestJS route ordering)

	@ApiOperation({ summary: 'Unassign vendor from maintenance request' })
	@ApiResponse({ status: 200, description: 'Vendor unassigned from maintenance request' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	@Delete('unassign/:maintenanceId')
	async unassignFromMaintenance(
		@Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
		@Request() req: AuthenticatedRequest,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		return this.vendorsService.assignToMaintenance(token, maintenanceId, null)
	}

	@ApiOperation({ summary: 'List vendors' })
	@ApiQuery({ name: 'trade', required: false, description: 'Filter by trade specialization' })
	@ApiQuery({ name: 'status', required: false, description: 'Filter by status (default: active)' })
	@ApiQuery({ name: 'search', required: false, description: 'Search by vendor name' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (max 100)' })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
	@ApiResponse({ status: 200, description: 'Paginated vendor list' })
	@Get()
	async findAll(
		@Request() req: AuthenticatedRequest,
		@Query('trade') trade?: string,
		@Query('status') status?: string,
		@Query('search') search?: string,
		@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		return this.vendorsService.findAll(token, {
			...(trade !== undefined && { trade }),
			...(status !== undefined && { status }),
			...(search !== undefined && { search }),
			...(limit !== undefined && { limit }),
			...(offset !== undefined && { offset }),
		})
	}

	@ApiOperation({ summary: 'Get vendor by ID' })
	@ApiResponse({ status: 200, description: 'Vendor record' })
	@ApiResponse({ status: 404, description: 'Vendor not found' })
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		return this.vendorsService.findOne(token, id)
	}

	@ApiOperation({ summary: 'Create vendor' })
	@ApiResponse({ status: 201, description: 'Vendor created' })
	@Post()
	async create(
		@Body() dto: CreateVendorDto,
		@Request() req: AuthenticatedRequest,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		return this.vendorsService.create(token, req.user.id, dto)
	}

	@ApiOperation({ summary: 'Assign vendor to maintenance request' })
	@ApiResponse({ status: 200, description: 'Vendor assigned to maintenance request' })
	@ApiResponse({ status: 404, description: 'Maintenance request not found' })
	@Post(':id/assign/:maintenanceId')
	async assignToMaintenance(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
		@Request() req: AuthenticatedRequest,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		return this.vendorsService.assignToMaintenance(token, maintenanceId, id)
	}

	@ApiOperation({ summary: 'Update vendor' })
	@ApiResponse({ status: 200, description: 'Vendor updated' })
	@ApiResponse({ status: 404, description: 'Vendor not found' })
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateVendorDto,
		@Request() req: AuthenticatedRequest,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		return this.vendorsService.update(token, id, dto)
	}

	@ApiOperation({ summary: 'Delete vendor' })
	@ApiResponse({ status: 200, description: 'Vendor deleted' })
	@ApiResponse({ status: 400, description: 'Delete failed' })
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: AuthenticatedRequest,
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) throw new UnauthorizedException()
		await this.vendorsService.remove(token, id)
		return { message: 'Vendor deleted successfully' }
	}
}
