import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { LeasesService } from './leases.service'
import { LeasePDFService } from './services/lease-pdf.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto } from './dto'

@ApiTags('Leases')
@Controller('leases')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly leasePDFService: LeasePDFService
  ) {}

  @Get()
  async getLeases(
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    return await this.leasesService.getByOwner(user.id, query)
  }

  @Get('stats')
  async getLeaseStats(@CurrentUser() user: ValidatedUser) {
    return await this.leasesService.getStats(user.id)
  }

  @Get('by-unit/:unitId')
  async getLeasesByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    return await this.leasesService.getByUnit(unitId, user.id, query)
  }

  @Get('by-tenant/:tenantId')
  async getLeasesByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    return await this.leasesService.getByTenant(tenantId, user.id, query)
  }

  @Get(':id')
  async getLease(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.leasesService.getByIdOrThrow(id, user.id)
  }

  @Post()
  async createLease(
    @Body() createLeaseDto: CreateLeaseDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.leasesService.create(
      createLeaseDto,
      user.id
    )
  }

  @Put(':id')
  async updateLease(
    @Param('id') id: string,
    @Body() updateLeaseDto: UpdateLeaseDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.leasesService.update(
      id,
      updateLeaseDto,
      user.id
    )
  }

  @Delete(':id')
  async deleteLease(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    await this.leasesService.delete(id, user.id)
    return { message: 'Lease deleted successfully' }
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