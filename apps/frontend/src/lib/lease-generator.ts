/**
 * Lease Generator Utilities
 */

import type { LeaseFormData } from '@tenantflow/shared'

export class LeaseGenerator {
  private formData: LeaseFormData

  constructor(formData: LeaseFormData) {
    this.formData = formData
  }

  /**
   * Generate a PDF lease document
   */
  async generatePDF(): Promise<Blob> {
    // This would integrate with a PDF generation service
    // For now, return a mock blob
    const content = this.generateLeaseContent()
    return new Blob([content], { type: 'application/pdf' })
  }

  /**
   * Generate lease content as text
   */
  private generateLeaseContent(): string {
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