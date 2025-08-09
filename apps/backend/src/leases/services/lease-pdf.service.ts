import { Injectable, Logger } from '@nestjs/common'
import { PDFGeneratorService } from '../../common/pdf/pdf-generator.service'
import { LeaseRepository } from '../lease.repository'
import { ErrorHandlerService } from '../../common/errors/error-handler.service'
import type { Lease, Tenant, Unit, Property } from '@repo/database'

export interface LeasePDFOptions {
  /** Whether to include company branding */
  includeBranding?: boolean
  /** Custom CSS for styling */
  customCSS?: string
  /** Whether to include page numbers */
  includePageNumbers?: boolean
  /** PDF format */
  format?: 'A4' | 'Letter' | 'Legal'
}

/**
 * Lease PDF Service
 * 
 * Specialized service for generating PDF lease agreements
 * Integrates with the PDFGeneratorService to create professional lease documents
 * 
 * Features:
 * - Generate lease agreement PDFs from database data
 * - Professional formatting with branding
 * - Texas-compliant lease templates
 * - Customizable styling and formatting
 * 
 * References:
 * - Texas Property Code: https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm
 * - Texas Tenant Advisor: https://www.texastenantadvisor.org/
 */
@Injectable()
export class LeasePDFService {
  private readonly logger = new Logger(LeasePDFService.name)

  constructor(
    private readonly pdfService: PDFGeneratorService,
    private readonly leaseRepository: LeaseRepository,
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * Generate PDF for a lease agreement
   */
  async generateLeasePDF(
    leaseId: string,
    ownerId: string,
    options: LeasePDFOptions = {}
  ) {
    try {
      // Fetch lease with all related data
      const lease = await this.leaseRepository.findByIdAndOwner(leaseId, ownerId) as (Lease & {
        Tenant: Tenant | null
        Unit: (Unit & { Property: Property }) | null
      }) | null

      if (!lease) {
        throw this.errorHandler.createNotFoundError('Lease', leaseId)
      }

      if (!lease.Tenant || !lease.Unit || !lease.Unit.Property) {
        throw new Error('Lease is missing required tenant, unit, or property information')
      }

      // Generate HTML content for the lease
      const htmlContent = this.generateLeaseHTML(lease as Lease & {
        Tenant: Tenant
        Unit: Unit & { Property: Property }
      }, options)
      
      // Generate filename
      const filename = this.generateFilename(lease as Lease & {
        Tenant: Tenant
        Unit: Unit & { Property: Property }
      })

      // Generate PDF
      const pdfResult = await this.pdfService.generatePDF({
        html: htmlContent,
        filename,
        format: options.format || 'Letter',
        css: options.customCSS,
        includePageNumbers: options.includePageNumbers ?? true,
        printBackground: true,
        headerTemplate: options.includeBranding ? this.getHeaderTemplate() : undefined,
        footerTemplate: this.getFooterTemplate()
      })

      this.logger.log('Lease PDF generated successfully', {
        leaseId,
        filename: pdfResult.filename,
        size: pdfResult.size
      })

      return pdfResult

    } catch (error) {
      this.logger.error('Failed to generate lease PDF', {
        leaseId,
        ownerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'generateLeasePDF',
        resource: 'lease-pdf',
        metadata: { leaseId, ownerId }
      })
    }
  }

  /**
   * Generate HTML content for lease agreement
   */
  private generateLeaseHTML(
    lease: Lease & {
      Tenant: Tenant
      Unit: Unit & { Property: Property }
    },
    options: LeasePDFOptions
  ): string {
    const { Tenant: tenant, Unit: unit } = lease
    const property = unit.Property

    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date))

    return `
      <div class="lease-document">
        ${options.includeBranding ? this.getBrandingHeader() : ''}
        
        <div class="document-header">
          <h1>RESIDENTIAL LEASE AGREEMENT</h1>
          <h2>STATE OF TEXAS</h2>
        </div>

        <div class="agreement-intro">
          <p><strong>THIS AGREEMENT</strong> is made this ______ day of _________, ______, between 
          <strong>[OWNER NAME]</strong> ("Landlord") and 
          <strong>${tenant.name}</strong> ("Tenant").</p>
        </div>

        <div class="property-details">
          <h3>1. PROPERTY</h3>
          <p>Landlord leases to Tenant the following described property:</p>
          <p><strong>Address:</strong> ${property.address}, ${property.city}, ${property.state} ${property.zipCode}</p>
          ${unit.unitNumber ? `<p><strong>Unit:</strong> ${unit.unitNumber}</p>` : ''}
          <p><strong>Property Type:</strong> ${property.propertyType || 'Residential'}</p>
        </div>

        <div class="lease-terms">
          <h3>2. LEASE TERM</h3>
          <p>The lease term begins on <strong>${formatDate(lease.startDate)}</strong> and ends on 
          <strong>${formatDate(lease.endDate)}</strong>.</p>
        </div>

        <div class="rent-details">
          <h3>3. RENT</h3>
          <p>Tenant agrees to pay rent in the amount of <strong>${formatCurrency(lease.rentAmount)}</strong> 
          per month, due on the first day of each month.</p>
          ${lease.securityDeposit > 0 ? `
            <p>Security Deposit: <strong>${formatCurrency(lease.securityDeposit)}</strong></p>
          ` : ''}
        </div>

        <div class="tenant-obligations">
          <h3>4. TENANT OBLIGATIONS</h3>
          <p>Tenant agrees to:</p>
          <ul>
            <li>Pay rent on time and in full</li>
            <li>Maintain the property in good condition</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not disturb other tenants or neighbors</li>
            <li>Allow landlord reasonable access for inspections and repairs</li>
          </ul>
        </div>

        <div class="landlord-obligations">
          <h3>5. LANDLORD OBLIGATIONS</h3>
          <p>Landlord agrees to:</p>
          <ul>
            <li>Maintain the property in habitable condition</li>
            <li>Make necessary repairs in a timely manner</li>
            <li>Provide quiet enjoyment of the premises</li>
            <li>Comply with all applicable housing codes</li>
          </ul>
        </div>

        <div class="termination">
          <h3>6. TERMINATION</h3>
          <p>This lease may be terminated by either party with proper notice as required by Texas law. 
          Early termination by tenant may result in forfeiture of security deposit and additional penalties.</p>
        </div>

        ${lease.terms ? `
          <div class="additional-terms">
            <h3>7. ADDITIONAL TERMS</h3>
            <div class="terms-content">${lease.terms.replace(/\n/g, '<br>')}</div>
          </div>
        ` : ''}

        <div class="legal-notices">
          <h3>8. LEGAL NOTICES</h3>
          <p><strong>Texas Property Code Notice:</strong> This lease agreement is subject to the Texas Property Code. 
          Tenants have rights under Texas law, including the right to a habitable dwelling and protection against 
          unlawful eviction.</p>
          <p><strong>Lead-Based Paint Disclosure:</strong> Housing built before 1978 may contain lead-based paint. 
          Lead from paint, paint chips, and dust can pose health hazards if not managed properly.</p>
        </div>

        <div class="signatures">
          <h3>9. SIGNATURES</h3>
          
          <div class="signature-block">
            <div class="signature-line"></div>
            <p><strong>LANDLORD:</strong> [OWNER NAME]</p>
            <p>Date: _________________</p>
          </div>

          <div class="signature-block">
            <div class="signature-line"></div>
            <p><strong>TENANT:</strong> ${tenant.name}</p>
            <p>Email: ${tenant.email}</p>
            <p>Phone: ${tenant.phone || '[PHONE NUMBER]'}</p>
            <p>Date: _________________</p>
          </div>
        </div>

        <div class="document-footer">
          <p><em>Generated on ${formatDate(new Date())} by TenantFlow Property Management</em></p>
        </div>
      </div>
    `
  }

  /**
   * Generate filename for lease PDF
   */
  private generateFilename(lease: Lease & { Tenant: Tenant; Unit: Unit & { Property: Property } }): string {
    const tenantName = lease.Tenant.name.replace(/\s+/g, '_')
    const propertyAddress = lease.Unit.Property.address.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
    const startDate = lease.startDate.toISOString().split('T')[0]
    
    return `lease_${tenantName}_${propertyAddress}_${startDate}`
  }

  /**
   * Get branding header HTML
   */
  private getBrandingHeader(): string {
    return `
      <div class="branding-header">
        <div class="company-info">
          <h2>TenantFlow Property Management</h2>
          <p>Professional Property Management Services</p>
        </div>
      </div>
    `
  }

  /**
   * Get header template for PDF
   */
  private getHeaderTemplate(): string {
    return `
      <div style="font-size: 10px; text-align: center; width: 100%; margin: 0; padding: 10px 0;">
        <span>TenantFlow Property Management - Residential Lease Agreement</span>
      </div>
    `
  }

  /**
   * Get footer template for PDF
   */
  private getFooterTemplate(): string {
    return `
      <div style="font-size: 10px; text-align: center; width: 100%; margin: 0; padding: 5px 0;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span style="float: right;">Generated by TenantFlow on ${new Date().toLocaleDateString()}</span>
      </div>
    `
  }
}