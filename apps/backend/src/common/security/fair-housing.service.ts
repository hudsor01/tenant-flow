import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SecurityAuditService } from './audit.service'
import { SecurityEventType } from '@tenantflow/shared'

/**
 * Minimal Fair Housing Act Compliance Service
 * 
 * MVP implementation focusing on critical compliance requirements:
 * 1. Block protected class fields in tenant applications
 * 2. Detect obvious discriminatory language in listings
 * 3. Log all validation attempts for audit trail
 */
@Injectable()
export class FairHousingService {
  private readonly logger = new Logger(FairHousingService.name)

  // Core protected class fields that MUST NOT be collected
  private readonly PROHIBITED_FIELDS = [
    'race', 'color', 'religion', 'sex', 'gender', 'national_origin',
    'familial_status', 'disability', 'age', 'marital_status'
  ]

  // Most obvious discriminatory terms to catch
  private readonly DISCRIMINATORY_TERMS = [
    'no_kids', 'no_children', 'adults_only', 'no_section_8', 
    'no_vouchers', 'male_only', 'female_only', 'disabled', 'handicapped'
  ]

  constructor(private readonly auditService: SecurityAuditService) {}

  /**
   * Validates tenant application for prohibited fields
   */
  async validateTenantData(data: any, userId: string, ipAddress?: string): Promise<void> {
    const violations = this.findProhibitedFields(data)
    
    if (violations.length > 0) {
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.VALIDATION_FAILURE,
        userId,
        ipAddress,
        resource: 'tenant_application',
        action: 'fair_housing_violation',
        details: JSON.stringify({ violations, compliance: 'fair_housing_act' })
      })

      throw new BadRequestException(
        `Fair Housing violation: Cannot collect ${violations.join(', ')} information`
      )
    }

    // Log successful validation
    await this.auditService.logSecurityEvent({
      eventType: SecurityEventType.VALIDATION_FAILURE,
      userId,
      ipAddress,
      resource: 'tenant_application', 
      action: 'fair_housing_passed',
      details: JSON.stringify({ status: 'passed', compliance: 'fair_housing_act' })
    })
  }

  /**
   * Validates property listing for discriminatory language
   */
  async validatePropertyListing(data: any, userId: string, ipAddress?: string): Promise<void> {
    const textContent = this.extractTextContent(data)
    const violations = this.findDiscriminatoryTerms(textContent)

    if (violations.length > 0) {
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.VALIDATION_FAILURE,
        userId,
        ipAddress,
        resource: 'property_listing',
        action: 'discriminatory_language',
        details: JSON.stringify({ terms: violations, compliance: 'fair_housing_act' })
      })

      throw new BadRequestException(
        `Discriminatory language detected: ${violations.join(', ')}. Please revise listing.`
      )
    }
  }

  /**
   * Find prohibited fields in tenant data
   */
  private findProhibitedFields(data: any): string[] {
    const violations: string[] = []
    const flatData = this.flattenObject(data)

    for (const [key] of Object.entries(flatData)) {
      const lowerKey = key.toLowerCase()
      
      for (const prohibitedField of this.PROHIBITED_FIELDS) {
        if (lowerKey.includes(prohibitedField) || lowerKey.includes(prohibitedField.replace('_', ''))) {
          violations.push(prohibitedField)
        }
      }
    }

    return [...new Set(violations)] // Remove duplicates
  }

  /**
   * Find discriminatory terms in text content
   */
  private findDiscriminatoryTerms(text: string): string[] {
    if (!text) return []
    
    const lowerText = text.toLowerCase()
    const violations: string[] = []

    for (const term of this.DISCRIMINATORY_TERMS) {
      if (lowerText.includes(term.replace('_', ' ')) || lowerText.includes(term)) {
        violations.push(term)
      }
    }

    return violations
  }

  /**
   * Extract text content from object for analysis
   */
  private extractTextContent(data: any): string {
    const textFields: string[] = []
    const flatData = this.flattenObject(data)

    for (const [key, value] of Object.entries(flatData)) {
      if (typeof value === 'string' && value.length > 5) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes('description') || lowerKey.includes('notes') || 
            lowerKey.includes('requirements') || lowerKey.includes('criteria')) {
          textFields.push(value)
        }
      }
    }

    return textFields.join(' ')
  }

  /**
   * Simple object flattening for field analysis
   */
  private flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
    const flattened: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj || {})) {
      const newKey = prefix ? `${prefix}.${key}` : key

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }

    return flattened
  }
}