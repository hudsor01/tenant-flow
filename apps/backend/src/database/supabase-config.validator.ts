/**
 * Supabase Configuration Validator
 *
 * Validates Supabase configuration format and consistency before client initialization.
 * Prevents runtime errors by catching configuration issues at startup.
 */

export interface SupabaseConfigValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class SupabaseConfigValidator {
  /**
   * Validate Supabase configuration format and consistency
   *
   * Checks:
   * 1. URL is a valid Supabase URL
   * 2. Secret key is valid (modern sb_secret_* or legacy JWT eyJ*)
   * 3. Project ref matches the project in the URL
   *
   * @param config Configuration to validate
   * @returns Validation result with errors and warnings
   */
  static validate(config: {
    url: string
    secretKey: string
    projectRef: string
  }): SupabaseConfigValidation {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate URL format
    try {
      const urlObj = new URL(config.url)
      if (!urlObj.hostname.includes('supabase')) {
        errors.push('SUPABASE_URL must be a Supabase URL (contains "supabase")')
      }
    } catch {
      errors.push('SUPABASE_URL must be a valid URL')
    }

    // Validate secret key format (modern or legacy)
    if (!this.isValidSecretKey(config.secretKey)) {
      errors.push('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
    }

    // Validate project ref consistency
    const extractedRef = this.extractProjectRef(config.url)
    if (extractedRef && extractedRef !== config.projectRef) {
      warnings.push(
        `PROJECT_REF (${config.projectRef}) does not match URL project (${extractedRef})`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Verify secret key format
   * Accepts both modern (sb_secret_*) and legacy JWT (eyJ*) formats
   *
   * @param key Secret key to validate
   * @returns True if key appears to be valid
   */
  private static isValidSecretKey(key: string): boolean {
    return key.startsWith('sb_secret_') || key.startsWith('eyJ')
  }

  /**
   * Extract project ref from Supabase URL
   * Supabase URLs follow the pattern: https://<project-ref>.supabase.co
   *
   * @param url Supabase URL
   * @returns Extracted project ref or null if not found
   */
  private static extractProjectRef(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname

      // Match pattern: <project-ref>.supabase.co or <project-ref>.supabase.in
      const match = hostname.match(/^([a-z0-9]+)\.supabase\.(co|in)$/)
      return match?.[1] ?? null
    } catch {
      return null
    }
  }

}
