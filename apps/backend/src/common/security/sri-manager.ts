import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

/**
 * External resource configuration for SRI validation
 */
export interface ExternalResource {
    url: string
    integrity?: string
    crossorigin?: 'anonymous' | 'use-credentials'
    type: 'script' | 'stylesheet' | 'link'
    description: string
    lastUpdated: Date
    isRequired: boolean
}

/**
 * SRI validation result
 */
export interface SRIValidationResult {
    resource: ExternalResource
    hasIntegrity: boolean
    isValid: boolean
    recommendations: string[]
    securityRisk: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Subresource Integrity (SRI) Manager
 * Manages and validates SRI hashes for external resources
 */
@Injectable()
export class SRIManager {
    private readonly logger = new Logger(SRIManager.name)
    
    // Known external resources that should have SRI
    private readonly knownResources: ExternalResource[] = [
        {
            url: 'https://www.googletagmanager.com/gtag/js',
            type: 'script',
            description: 'Google Analytics Global Site Tag',
            lastUpdated: new Date('2025-01-01'),
            isRequired: true,
            // Note: Google Analytics doesn't support SRI due to dynamic content
            // This is documented as an acceptable risk
        },
        {
            url: 'https://www.googletagmanager.com/gtm.js',
            type: 'script', 
            description: 'Google Tag Manager',
            lastUpdated: new Date('2025-01-01'),
            isRequired: true,
            // Note: GTM doesn't support SRI due to dynamic content
        },
        {
            url: 'https://js.stripe.com/v3/pricing-table.js',
            type: 'script',
            description: 'Stripe Pricing Table Component',
            lastUpdated: new Date('2025-01-01'),
            isRequired: true,
            // Note: Stripe scripts don't support SRI due to dynamic updates
        },
        {
            url: 'https://fonts.googleapis.com/css2',
            type: 'stylesheet',
            description: 'Google Fonts CSS',
            lastUpdated: new Date('2025-01-01'),
            isRequired: true,
            // Note: Google Fonts CSS is dynamic and doesn't support SRI
        }
    ]

    constructor(private configService: ConfigService) {}

    /**
     * Validate SRI implementation for all known external resources
     */
    validateAllResources(): SRIValidationResult[] {
        return this.knownResources.map(resource => this.validateResource(resource))
    }

    /**
     * Validate SRI implementation for a specific resource
     */
    validateResource(resource: ExternalResource): SRIValidationResult {
        const hasIntegrity = !!resource.integrity
        const recommendations: string[] = []
        let securityRisk: 'low' | 'medium' | 'high' | 'critical' = 'low'

        // Check if resource should have SRI
        if (this.shouldHaveSRI(resource)) {
            if (!hasIntegrity) {
                recommendations.push(`Add SRI hash for ${resource.description}`)
                securityRisk = this.calculateSecurityRisk(resource)
            }
        } else {
            // Document why SRI is not applicable
            recommendations.push(`SRI not applicable for ${resource.description} - ${this.getNoSRIReason(resource)}`)
        }

        // Additional security recommendations
        if (resource.type === 'script' && !resource.crossorigin) {
            recommendations.push('Consider adding crossorigin="anonymous" for better error reporting')
        }

        // Check for secure transport
        if (!resource.url.startsWith('https://')) {
            recommendations.push('Resource should be loaded over HTTPS')
            securityRisk = 'critical'
        }

        return {
            resource,
            hasIntegrity,
            isValid: hasIntegrity || !this.shouldHaveSRI(resource),
            recommendations,
            securityRisk
        }
    }

    /**
     * Generate SRI hash for a given content
     */
    generateSRIHash(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string {
        const hash = crypto.createHash(algorithm).update(content).digest('base64')
        return `${algorithm}-${hash}`
    }

    /**
     * Get security recommendations for external resources
     */
    getSecurityRecommendations(): {
        summary: string
        critical: string[]
        high: string[]
        medium: string[]
        low: string[]
        acceptable: string[]
    } {
        const validationResults = this.validateAllResources()
        const critical: string[] = []
        const high: string[] = []
        const medium: string[] = []
        const low: string[] = []
        const acceptable: string[] = []

        validationResults.forEach(result => {
            const resourceName = result.resource.description
            
            if (result.securityRisk === 'critical') {
                critical.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`))
            } else if (result.securityRisk === 'high') {
                high.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`))
            } else if (result.securityRisk === 'medium') {
                medium.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`))
            } else if (result.securityRisk === 'low') {
                low.push(...result.recommendations.map(rec => `${resourceName}: ${rec}`))
            }

            // Track acceptable risks
            if (!this.shouldHaveSRI(result.resource)) {
                acceptable.push(`${resourceName}: SRI not applicable - ${this.getNoSRIReason(result.resource)}`)
            }
        })

        return {
            summary: this.generateSummary(validationResults),
            critical,
            high, 
            medium,
            low,
            acceptable
        }
    }

    /**
     * Log SRI security assessment
     */
    logSecurityAssessment(): void {
        const recommendations = this.getSecurityRecommendations()
        
        this.logger.log('🔒 SRI Security Assessment Complete')
        this.logger.log(recommendations.summary)

        if (recommendations.critical.length > 0) {
            this.logger.error('🚨 Critical SRI Issues:')
            recommendations.critical.forEach(issue => this.logger.error(`  - ${issue}`))
        }

        if (recommendations.high.length > 0) {
            this.logger.warn('⚠️ High Priority SRI Issues:')
            recommendations.high.forEach(issue => this.logger.warn(`  - ${issue}`))
        }

        if (recommendations.medium.length > 0) {
            this.logger.warn('📋 Medium Priority SRI Issues:')
            recommendations.medium.forEach(issue => this.logger.warn(`  - ${issue}`))
        }

        if (recommendations.acceptable.length > 0) {
            this.logger.log('✅ Acceptable SRI Exceptions:')
            recommendations.acceptable.forEach(exception => this.logger.log(`  - ${exception}`))
        }

        this.logger.log('📚 For more information: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity')
    }

    /**
     * Private helper methods
     */
    private shouldHaveSRI(resource: ExternalResource): boolean {
        // Resources that typically can't have SRI due to dynamic content
        const dynamicResourcePatterns = [
            /googletagmanager\.com/,  // GTM and Analytics are dynamic
            /js\.stripe\.com/,         // Stripe updates their scripts
            /fonts\.googleapis\.com/   // Google Fonts CSS is dynamic
        ]

        return !dynamicResourcePatterns.some(pattern => pattern.test(resource.url))
    }

    private getNoSRIReason(resource: ExternalResource): string {
        if (resource.url.includes('googletagmanager.com')) {
            return 'Google Analytics/GTM scripts are dynamically generated and updated'
        }
        if (resource.url.includes('js.stripe.com')) {
            return 'Stripe scripts are updated frequently and dynamically generated'
        }
        if (resource.url.includes('fonts.googleapis.com')) {
            return 'Google Fonts CSS is dynamically generated based on user agent'
        }
        return 'Dynamic content that changes frequently'
    }

    private calculateSecurityRisk(resource: ExternalResource): 'low' | 'medium' | 'high' | 'critical' {
        // Critical: Insecure transport
        if (!resource.url.startsWith('https://')) {
            return 'critical'
        }

        // High: Required scripts without SRI from third parties
        if (resource.isRequired && resource.type === 'script') {
            return 'high'
        }

        // Medium: Optional scripts or stylesheets without SRI
        if (resource.type === 'script') {
            return 'medium'
        }

        return 'low'
    }

    private generateSummary(results: SRIValidationResult[]): string {
        const total = results.length
        const withSRI = results.filter(r => r.hasIntegrity).length
        const applicable = results.filter(r => this.shouldHaveSRI(r.resource)).length
        const acceptable = total - applicable

        return `SRI Status: ${withSRI}/${applicable} applicable resources have SRI hashes. ${acceptable} resources have acceptable SRI exceptions.`
    }
}