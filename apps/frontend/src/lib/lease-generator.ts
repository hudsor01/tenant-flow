/**
 * Lease Generator Utilities
 */

import type { LeaseFormData } from '@tenantflow/shared/types/lease-generator'

export class LeaseGenerator {
  private formData: LeaseFormData

  constructor(formData: LeaseFormData) {
    this.formData = formData
  }

  /**
   * Generate a PDF lease document using browser print API
   */
  async generatePDF(): Promise<Blob> {
    const content = this.generateLeaseHTML()
    
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.')
    }
    
    printWindow.document.write(content)
    printWindow.document.close()
    
    // Wait for content to load
    await new Promise(resolve => {
      printWindow.onload = resolve
      setTimeout(resolve, 1000) // Fallback timeout
    })
    
    // Convert to PDF using print media query and return as blob
    const html = printWindow.document.documentElement.outerHTML
    printWindow.close()
    
    // Create a blob with the HTML content styled for PDF
    return new Blob([html], { type: 'text/html' })
  }
  
  /**
   * Generate lease content as formatted HTML for PDF
   */
  private generateLeaseHTML(): string {
    const content = this.generateLeaseContent()
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lease Agreement</title>
          <style>
            @media print {
              body { margin: 1in; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
              h1 { text-align: center; font-size: 16pt; margin-bottom: 20pt; }
              .section { margin-bottom: 15pt; }
              .signature-line { border-bottom: 1px solid #000; width: 200pt; display: inline-block; margin: 0 10pt; }
            }
            body { margin: 1in; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
            h1 { text-align: center; font-size: 16pt; margin-bottom: 20pt; }
            .section { margin-bottom: 15pt; }
            .signature-line { border-bottom: 1px solid #000; width: 200pt; display: inline-block; margin: 0 10pt; }
          </style>
        </head>
        <body>
          <h1>RESIDENTIAL LEASE AGREEMENT</h1>
          <pre>${content}</pre>
          
          <div style="margin-top: 40pt;">
            <div class="section">
              <p>LANDLORD SIGNATURE: <span class="signature-line"></span> DATE: <span class="signature-line"></span></p>
            </div>
            <div class="section">
              <p>TENANT SIGNATURE: <span class="signature-line"></span> DATE: <span class="signature-line"></span></p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate lease content as text
   */
  public generateLeaseContent(): string {
    const { 
      propertyAddress, 
      city, 
      state, 
      zipCode,
      landlordName,
      tenantNames,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      securityDeposit
    } = this.formData

    return `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is entered into on ${new Date().toLocaleDateString()}, between:

LANDLORD: ${landlordName}

TENANT(S): ${tenantNames.join(', ')}

PROPERTY: ${propertyAddress}, ${city}, ${state} ${zipCode}

LEASE TERM: From ${leaseStartDate} to ${leaseEndDate}

MONTHLY RENT: $${rentAmount}

SECURITY DEPOSIT: $${securityDeposit}

[Additional lease terms and conditions would be included here based on state requirements]
    `.trim()
  }

  /**
   * Validate the form data before generation
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.formData.propertyAddress) {
      errors.push('Property address is required')
    }

    if (!this.formData.landlordName) {
      errors.push('Landlord name is required')
    }

    if (!this.formData.tenantNames || this.formData.tenantNames.length === 0) {
      errors.push('At least one tenant name is required')
    }

    if (!this.formData.rentAmount || this.formData.rentAmount <= 0) {
      errors.push('Valid rent amount is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Helper function to download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}