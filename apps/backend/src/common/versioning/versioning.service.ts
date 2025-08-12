import { Injectable, Logger } from '@nestjs/common'
import { ApiVersionConfig } from '../interceptors/api-version.interceptor'

export interface VersionInfo {
  version: string
  releaseDate: string
  isDeprecated: boolean
  deprecationDate?: string
  supportEndDate?: string
  securityUpdates: boolean
  changelogUrl?: string
  migrationGuideUrl?: string
}

/**
 * Versioning Service
 * 
 * Manages API versioning, deprecation schedules, and security updates.
 */
@Injectable()
export class VersioningService {
  private readonly logger = new Logger(VersioningService.name)

  private readonly versions: Record<string, VersionInfo> = {
    'v1': {
      version: 'v1',
      releaseDate: '2024-01-01',
      isDeprecated: false,
      securityUpdates: true,
      changelogUrl: '/docs/changelog/v1',
      migrationGuideUrl: '/docs/migration/v1-to-v2'
    },
    'v2': {
      version: 'v2',
      releaseDate: '2024-08-01',
      isDeprecated: false,
      securityUpdates: true,
      changelogUrl: '/docs/changelog/v2'
    }
  }

  /**
   * Get information about all API versions
   */
  getAllVersions(): VersionInfo[] {
    return Object.values(this.versions)
  }

  /**
   * Get information about a specific version
   */
  getVersionInfo(version: string): VersionInfo | null {
    return this.versions[version] || null
  }

  /**
   * Get supported API versions
   */
  getSupportedVersions(): string[] {
    return Object.keys(this.versions).filter(version => {
      const versionInfo = this.versions[version]
      return versionInfo && (!versionInfo.isDeprecated || versionInfo.securityUpdates)
    })
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(): string[] {
    return Object.keys(this.versions).filter(version => {
      const versionInfo = this.versions[version]
      return versionInfo && versionInfo.isDeprecated
    })
  }

  /**
   * Get the latest stable version
   */
  getLatestVersion(): string {
    const supportedVersions = this.getSupportedVersions()
    
    // Sort versions numerically
    const sorted = supportedVersions.sort((a, b) => {
      const aNum = parseInt(a.replace('v', ''))
      const bNum = parseInt(b.replace('v', ''))
      return bNum - aNum // Descending order
    })

    return sorted[0] || 'v1'
  }

  /**
   * Check if a version requires security upgrade
   */
  requiresSecurityUpgrade(version: string): boolean {
    const versionInfo = this.getVersionInfo(version)
    
    if (!versionInfo) {
      return true // Unknown versions require upgrade
    }

    return versionInfo.isDeprecated && !versionInfo.securityUpdates
  }

  /**
   * Mark a version as deprecated
   */
  deprecateVersion(version: string, deprecationDate: string, supportEndDate: string): void {
    const versionInfo = this.versions[version]
    if (versionInfo) {
      this.versions[version] = {
        ...versionInfo,
        isDeprecated: true,
        deprecationDate,
        supportEndDate
      }

      this.logger.warn(`API version ${version} marked as deprecated`, {
        deprecationDate,
        supportEndDate
      })
    }
  }

  /**
   * End security support for a version
   */
  endSecuritySupport(version: string): void {
    const versionInfo = this.versions[version]
    if (versionInfo) {
      versionInfo.securityUpdates = false
      
      this.logger.error(`Security support ended for API version ${version}`, {
        version,
        endDate: new Date().toISOString()
      })
    }
  }

  /**
   * Get API version configuration for the interceptor
   */
  getApiVersionConfig(): ApiVersionConfig {
    return {
      supportedVersions: this.getSupportedVersions(),
      defaultVersion: 'v1', // Keep v1 as default for backward compatibility
      deprecatedVersions: this.getDeprecatedVersions(),
      unsupportedVersions: Object.keys(this.versions).filter(version => {
        const versionInfo = this.versions[version]
        return versionInfo && versionInfo.isDeprecated && !versionInfo.securityUpdates
      })
    }
  }

  /**
   * Check for security vulnerabilities in a version
   */
  hasSecurityVulnerabilities(version: string): boolean {
    // In a real implementation, this would check against a vulnerability database
    const versionInfo = this.getVersionInfo(version)
    
    if (!versionInfo) {
      return true // Unknown versions are considered vulnerable
    }

    // Check if version is too old (example: versions older than 1 year)
    const releaseDate = new Date(versionInfo.releaseDate)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    
    if (releaseDate < oneYearAgo && versionInfo.isDeprecated) {
      return true
    }

    return false
  }

  /**
   * Get migration path for upgrading from one version to another
   */
  getMigrationPath(fromVersion: string, toVersion?: string): {
    targetVersion: string
    steps: string[]
    estimatedTime: string
    breakingChanges: boolean
  } {
    const target = toVersion || this.getLatestVersion()
    
    // Simplified migration logic
    const migrations: Record<string, { steps: string[]; estimatedTime: string; breaking: boolean }> = {
      'v1->v2': {
        steps: [
          'Update authentication headers to use X-API-Version',
          'Migrate date formats from ISO strings to RFC3339',
          'Update error response structures',
          'Test all endpoints with new version'
        ],
        estimatedTime: '2-4 hours',
        breaking: true
      }
    }

    const migrationKey = `${fromVersion}->${target}`
    const migration = migrations[migrationKey]

    return {
      targetVersion: target,
      steps: migration?.steps || ['No migration steps available'],
      estimatedTime: migration?.estimatedTime || 'Unknown',
      breakingChanges: migration?.breaking || false
    }
  }

  /**
   * Generate security advisory for version
   */
  generateSecurityAdvisory(version: string): {
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    recommendation: string
    cveIds?: string[]
  } | null {
    const versionInfo = this.getVersionInfo(version)
    
    if (!versionInfo) {
      return {
        severity: 'critical',
        message: `Unknown API version ${version} detected`,
        recommendation: `Upgrade to the latest supported version: ${this.getLatestVersion()}`
      }
    }

    if (this.hasSecurityVulnerabilities(version)) {
      return {
        severity: 'high',
        message: `API version ${version} has known security vulnerabilities`,
        recommendation: `Upgrade to version ${this.getLatestVersion()} immediately`,
        cveIds: [] // Would be populated with actual CVE IDs
      }
    }

    if (versionInfo.isDeprecated && !versionInfo.securityUpdates) {
      return {
        severity: 'medium',
        message: `API version ${version} is deprecated and no longer receives security updates`,
        recommendation: `Migrate to version ${this.getLatestVersion()} before ${versionInfo.supportEndDate}`
      }
    }

    return null
  }
}