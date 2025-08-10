"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LeasePDFService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeasePDFService = void 0;
const common_1 = require("@nestjs/common");
const pdf_generator_service_1 = require("../../common/pdf/pdf-generator.service");
const lease_repository_1 = require("../lease.repository");
const error_handler_service_1 = require("../../common/errors/error-handler.service");
let LeasePDFService = LeasePDFService_1 = class LeasePDFService {
    constructor(pdfService, leaseRepository, errorHandler) {
        this.pdfService = pdfService;
        this.leaseRepository = leaseRepository;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(LeasePDFService_1.name);
    }
    async generateLeasePDF(leaseId, ownerId, options = {}) {
        try {
            const lease = await this.leaseRepository.findByIdAndOwner(leaseId, ownerId);
            if (!lease) {
                throw this.errorHandler.createNotFoundError('Lease', leaseId);
            }
            if (!lease.Tenant || !lease.Unit || !lease.Unit.Property) {
                throw new Error('Lease is missing required tenant, unit, or property information');
            }
            const htmlContent = this.generateLeaseHTML(lease, options);
            const filename = this.generateFilename(lease);
            const pdfResult = await this.pdfService.generatePDF({
                html: htmlContent,
                filename,
                format: options.format || 'Letter',
                css: options.customCSS,
                includePageNumbers: options.includePageNumbers ?? true,
                printBackground: true,
                headerTemplate: options.includeBranding ? this.getHeaderTemplate() : undefined,
                footerTemplate: this.getFooterTemplate()
            });
            this.logger.log('Lease PDF generated successfully', {
                leaseId,
                filename: pdfResult.filename,
                size: pdfResult.size
            });
            return pdfResult;
        }
        catch (error) {
            this.logger.error('Failed to generate lease PDF', {
                leaseId,
                ownerId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'generateLeasePDF',
                resource: 'lease-pdf',
                metadata: { leaseId, ownerId }
            });
        }
    }
    generateLeaseHTML(lease, options) {
        const { Tenant: tenant, Unit: unit } = lease;
        const property = unit.Property;
        const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
        const formatDate = (date) => new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
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
    `;
    }
    generateFilename(lease) {
        const tenantName = lease.Tenant.name.replace(/\s+/g, '_');
        const propertyAddress = lease.Unit.Property.address.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const startDate = lease.startDate.toISOString().split('T')[0];
        return `lease_${tenantName}_${propertyAddress}_${startDate}`;
    }
    getBrandingHeader() {
        return `
      <div class="branding-header">
        <div class="company-info">
          <h2>TenantFlow Property Management</h2>
          <p>Professional Property Management Services</p>
        </div>
      </div>
    `;
    }
    getHeaderTemplate() {
        return `
      <div style="font-size: 10px; text-align: center; width: 100%; margin: 0; padding: 10px 0;">
        <span>TenantFlow Property Management - Residential Lease Agreement</span>
      </div>
    `;
    }
    getFooterTemplate() {
        return `
      <div style="font-size: 10px; text-align: center; width: 100%; margin: 0; padding: 5px 0;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span style="float: right;">Generated by TenantFlow on ${new Date().toLocaleDateString()}</span>
      </div>
    `;
    }
};
exports.LeasePDFService = LeasePDFService;
exports.LeasePDFService = LeasePDFService = LeasePDFService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pdf_generator_service_1.PDFGeneratorService,
        lease_repository_1.LeaseRepository,
        error_handler_service_1.ErrorHandlerService])
], LeasePDFService);
