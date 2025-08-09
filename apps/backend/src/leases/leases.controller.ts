import {
  Controller,
  Get,
  Param,
  Query,
  Res
} from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { LeasesService } from './leases.service'
import { LeasePDFService } from './services/lease-pdf.service'
import { Lease } from '@repo/database'
import { CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto } from './dto'
import { BaseCrudController } from '../common/controllers/base-crud.controller'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'

// Create the base CRUD controller class
const LeasesCrudController = BaseCrudController<
  Lease,
  CreateLeaseDto,
  UpdateLeaseDto,
  LeaseQueryDto
>({
  entityName: 'Lease',
  enableStats: true
})

@ApiTags('Leases')
@Controller('leases')
export class LeasesController extends LeasesCrudController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly leasePDFService: LeasePDFService
  ) {
    // Cast to compatible interface - the services implement the same functionality with different signatures
    super(leasesService as unknown as CrudService<Lease, CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto>)
  }

  // Add lease-specific endpoints that aren't part of basic CRUD

  @Get('by-unit/:unitId')
  async getLeasesByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    const leases = await this.leasesService.getByUnit(unitId, user.id, query)
    return {
      success: true,
      data: leases,
      message: 'Leases retrieved successfully'
    }
  }

  @Get('by-tenant/:tenantId')
  async getLeasesByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    const leases = await this.leasesService.getByTenant(tenantId, user.id, query)
    return {
      success: true,
      data: leases,
      message: 'Leases retrieved successfully'
    }
  }

  @Get(':id/pdf')
  @ApiOperation({
    summary: 'Generate lease agreement PDF',
    description: 'Generate a professional PDF lease agreement document'
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="lease.pdf"' }
    }
  })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  @ApiResponse({ status: 500, description: 'PDF generation failed' })
  async generateLeasePDF(
    @Param('id') leaseId: string,
    @CurrentUser() user: ValidatedUser,
    @Res() response: Response,
    @Query('format') format?: 'A4' | 'Letter' | 'Legal',
    @Query('branding') includeBranding?: string
  ): Promise<void> {
    const options = {
      format: format || 'Letter',
      includeBranding: includeBranding === 'true',
      includePageNumbers: true
    }

    const result = await this.leasePDFService.generateLeasePDF(
      leaseId,
      user.id,
      options
    )

    // Set response headers
    response.setHeader('Content-Type', result.mimeType)
    response.setHeader('Content-Length', result.size.toString())
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`
    )
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.setHeader('Pragma', 'no-cache')
    response.setHeader('Expires', '0')

    // Stream the PDF buffer
    response.end(result.buffer)
  }
}