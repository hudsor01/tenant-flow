import { Controller, Get, Param, Query } from '@nestjs/common'
import { Public } from '../../auth/decorators/public.decorator'
import { VersioningService } from './versioning.service'

/**
 * Versioning Controller
 * 
 * Provides public endpoints for API version information and migration guidance.
 */
@Controller('version')
@Public() // Version info should be publicly accessible
export class VersioningController {
  constructor(private readonly versioningService: VersioningService) {}

  /**
   * Get all supported API versions
   */
  @Get()
  getVersions() {
    return {
      versions: this.versioningService.getAllVersions(),
      supported: this.versioningService.getSupportedVersions(),
      deprecated: this.versioningService.getDeprecatedVersions(),
      latest: this.versioningService.getLatestVersion()
    }
  }

  /**
   * Get information about a specific version
   */
  @Get(':version')
  getVersionInfo(@Param('version') version: string) {
    const versionInfo = this.versioningService.getVersionInfo(version)
    
    if (!versionInfo) {
      return {
        error: 'VERSION_NOT_FOUND',
        message: `API version ${version} not found`,
        supported: this.versioningService.getSupportedVersions()
      }
    }

    const securityAdvisory = this.versioningService.generateSecurityAdvisory(version)
    
    return {
      ...versionInfo,
      requiresUpgrade: this.versioningService.requiresSecurityUpgrade(version),
      securityAdvisory
    }
  }

  /**
   * Get migration guide for upgrading between versions
   */
  @Get(':fromVersion/migrate')
  getMigrationGuide(
    @Param('fromVersion') fromVersion: string,
    @Query('to') toVersion?: string
  ) {
    return this.versioningService.getMigrationPath(fromVersion, toVersion)
  }

  /**
   * Check if a version has security issues
   */
  @Get(':version/security')
  getSecurityInfo(@Param('version') version: string) {
    const hasVulnerabilities = this.versioningService.hasSecurityVulnerabilities(version)
    const securityAdvisory = this.versioningService.generateSecurityAdvisory(version)
    const requiresUpgrade = this.versioningService.requiresSecurityUpgrade(version)

    return {
      version,
      hasVulnerabilities,
      requiresUpgrade,
      securityAdvisory,
      latestVersion: this.versioningService.getLatestVersion()
    }
  }
}