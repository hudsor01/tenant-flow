import { 
  Controller, 
  Get, 
  UseGuards, 
  Query, 
  Res,
  HttpStatus,
  HttpException
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SubscriptionGuard } from '../auth/guards/subscription.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequireActiveSubscription } from '../auth/decorators/subscription.decorator'
import { PropertiesService } from './properties.service'
import { SubscriptionStatusService } from '../subscriptions/subscription-status.service'
import { ValidatedUser } from '../auth/auth.service'
import { PropertyType } from '@prisma/client'

@Controller('properties/export')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class PropertyExportController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly subscriptionStatusService: SubscriptionStatusService
  ) {}

  /**
   * Export properties as CSV - PREMIUM FEATURE (Blocked for paused subscriptions)
   */
  @Get('csv')
  @RequireActiveSubscription()
  async exportPropertiesCSV(
    @CurrentUser() user: ValidatedUser,
    @Query() query: {
      propertyType?: PropertyType
      search?: string
      limit?: string | number
      offset?: string | number
    },
    @Res() res: FastifyReply
  ) {
    // This endpoint is automatically protected by SubscriptionGuard
    // Paused users will get a 403 error with payment redirect info
    
    try {
      const properties = await this.propertiesService.getPropertiesByOwner(user.id, query)
      
      // Convert to CSV
      const csvData = this.convertToCSV(properties as Record<string, unknown>[])
      
      res.header('Content-Type', 'text/csv')
      res.header('Content-Disposition', 'attachment; filename="properties.csv"')
      res.status(HttpStatus.OK).send(csvData)
    } catch {
      throw new HttpException(
        'Failed to export properties', 
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * Export property reports as PDF - PREMIUM FEATURE
   */
  @Get('pdf')
  @RequireActiveSubscription()
  async exportPropertyReport(
    @CurrentUser() user: ValidatedUser,
    @Query('propertyId') propertyId: string,
    @Res() res: FastifyReply
  ) {
    if (!propertyId) {
      throw new HttpException('Property ID required', HttpStatus.BAD_REQUEST)
    }

    // This will also be blocked for paused subscriptions
    const property = await this.propertiesService.getPropertyById(propertyId, user.id)
    
    if (!property) {
      throw new HttpException('Property not found', HttpStatus.NOT_FOUND)
    }

    // Generate PDF report logic here
    const pdfBuffer = await this.generatePropertyPDF(property || {})
    
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="property-${propertyId}-report.pdf"`)
    res.status(HttpStatus.OK).send(pdfBuffer)
  }

  /**
   * Bulk export all data - PREMIUM FEATURE
   */
  @Get('bulk')
  @RequireActiveSubscription()
  async bulkExportData(
    @CurrentUser() user: ValidatedUser,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: FastifyReply
  ) {
    // Get all user data
    const [properties] = await Promise.all([
      this.propertiesService.getPropertiesByOwner(user.id, {})
      // Add other service calls as needed
    ])

    const exportData = {
      properties: properties,
      // Add other data
      exportedAt: new Date().toISOString(),
      userId: user.id
    }

    if (format === 'csv') {
      const csvData = this.convertToCSV(properties as Record<string, unknown>[])
      res.header('Content-Type', 'text/csv')
      res.header('Content-Disposition', 'attachment; filename="tenantflow-data.csv"')
      res.status(HttpStatus.OK).send(csvData)
    } else {
      res.header('Content-Type', 'application/json')
      res.header('Content-Disposition', 'attachment; filename="tenantflow-data.json"')
      res.status(HttpStatus.OK).send(exportData)
    }
  }

  /**
   * Preview export (allowed for paused users to see what they're missing)
   */
  @Get('preview')
  // No subscription required - this is a teaser
  async getExportPreview(@CurrentUser() user: ValidatedUser) {
    const status = await this.subscriptionStatusService.getUserSubscriptionStatus(user.id)
    
    if (!status.canExportData) {
      // Show preview of what they could export
      const stats = await this.propertiesService.getStats(user.id)
      const propertiesCount = stats.totalProperties
      
      return {
        available: false,
        preview: {
          propertiesCount,
          message: 'Export all your property data, tenant information, and reports',
          formats: ['CSV', 'PDF', 'JSON'],
          upgradeRequired: true
        },
        paymentAction: {
          url: await this.subscriptionStatusService.getPaymentActionUrl(user.id),
          message: status.status && (status.status as string) === 'paused' 
            ? 'Your free trial has ended. Add a payment method to export your data.'
            : 'Upgrade to export your data.'
        }
      }
    }

    // Show actual export options for active subscribers
    return {
      available: true,
      formats: ['CSV', 'PDF', 'JSON'],
      endpoints: {
        csv: '/properties/export/csv',
        pdf: '/properties/export/pdf',
        bulk: '/properties/export/bulk'
      }
    }
  }

  // Helper methods
  private convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return ''
    if (!data[0]) return ''
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n')
    
    return csvContent
  }

  private async generatePropertyPDF(property: Record<string, unknown> | object): Promise<Buffer> {
    // PDF generation logic - placeholder
    return Buffer.from(`Property Report for ${(property as Record<string, unknown>)?.name || 'Unknown Property'}`)
  }
}