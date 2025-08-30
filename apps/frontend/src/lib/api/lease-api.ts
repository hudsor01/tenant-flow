import type { LeaseFormData } from '@repo/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface LeaseGenerationResponse {
  success: boolean
  lease: {
    id: string
    filename: string
    downloadUrl: string
    previewUrl: string
    generatedAt: string
    state: string
    propertyAddress: string
    monthlyRent: number
    tenantCount: number
  }
}

export interface LeaseValidationResponse {
  valid: boolean
  errors: Array<{
    field: string
    message: string
    code: string
  }>
  warnings: Array<{
    field: string
    message: string
    suggestion?: string
  }>
  stateRequirements: {
    stateName: string
    securityDepositMax: string
    lateFeeGracePeriod: string
    requiredDisclosures: string[]
  }
}

/**
 * Generate a new lease agreement PDF
 */
export async function generateLease(leaseData: LeaseFormData): Promise<LeaseGenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/lease/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leaseData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate lease`)
  }

  return response.json()
}

/**
 * Validate lease data against state requirements
 */
export async function validateLease(leaseData: LeaseFormData): Promise<LeaseValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/lease/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leaseData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}: Failed to validate lease`)
  }

  return response.json()
}

/**
 * Get the download URL for a lease PDF
 */
export function getLeaseDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/api/lease/download/${filename}`
}

/**
 * Get the preview URL for a lease PDF (inline view)
 */
export function getLeasePreviewUrl(filename: string): string {
  return `${API_BASE_URL}/api/lease/preview/${filename}`
}

/**
 * Download a lease PDF file
 */
export async function downloadLease(filename: string): Promise<Blob> {
  const response = await fetch(getLeaseDownloadUrl(filename))

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to download lease`)
  }

  return response.blob()
}

/**
 * Trigger browser download for a lease PDF
 */
export async function triggerLeaseDownload(filename: string, customName?: string): Promise<void> {
  try {
    const blob = await downloadLease(filename)
    const url = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = customName || filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the object URL
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading lease:', error)
    throw error
  }
}