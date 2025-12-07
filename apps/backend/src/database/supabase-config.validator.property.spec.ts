/**
 * SupabaseConfigValidator Property-Based Tests
 *
 * Property-based tests using fast-check to verify configuration validation
 * across a wide range of invalid inputs.
 *
 * Feature: fix-supabase-connectivity
 * Property 1: Configuration validation prevents invalid credentials
 * Validates: Requirements 1.2, 1.3, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check'
import { SupabaseConfigValidator } from './supabase-config.validator'

describe('SupabaseConfigValidator - Property-Based Tests', () => {
  describe('Property 1: Configuration validation prevents invalid credentials', () => {
    /**
     * Property: For any invalid configuration (bad URLs, non-JWT keys, mismatched refs),
     * the validator SHALL reject it with descriptive error messages.
     *
     * This test generates random invalid configurations and verifies:
     * 1. All invalid configurations fail validation (isValid = false)
     * 2. Validation errors are descriptive and non-empty
     * 3. The validator correctly identifies the specific issues
     */
    it('should reject all invalid configurations with descriptive errors', () => {
      // Generator for invalid URLs
      const invalidUrlArbitrary = fc.oneof(
        // Not a URL at all
        fc.string().filter((s) => {
          try {
            new URL(s)
            return false
          } catch {
            return s.length > 0 // Must be non-empty but invalid
          }
        }),
        // Valid URL but not Supabase
        fc.webUrl().filter((url) => !url.includes('supabase')),
        // Empty string
        fc.constant(''),
        // Random strings that look like URLs but aren't
        fc.constantFrom(
          'http://',
          'https://',
          'not-a-url',
          'ftp://example.com',
          'javascript:alert(1)',
          '//example.com'
        )
      )

      // Generator for invalid JWT keys
      const invalidJwtArbitrary = fc.oneof(
        // Random strings that don't start with eyJ
        fc
          .string()
          .filter((s) => !s.startsWith('eyJ') && s.length > 0),
        // Empty string
        fc.constant(''),
        // Common invalid patterns
        fc.constantFrom(
          'not-a-jwt',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          'sk_test_123456',
          'api_key_123456',
          'secret_key',
          '12345678',
          'eyj', // lowercase
          'EYJ', // uppercase
          ' eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' // leading space
        )
      )

      // Generator for project refs (can be any string)
      const projectRefArbitrary = fc.string({ minLength: 1, maxLength: 50 })

      // Generate invalid configurations
      // Note: Mismatched project refs only generate warnings, not errors,
      // so they are not included in the "invalid" configurations
      const invalidConfigArbitrary = fc.oneof(
        // Invalid URL only
        fc.record({
          url: invalidUrlArbitrary,
          secretKey: fc.constant('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'),
          projectRef: projectRefArbitrary
        }),
        // Invalid JWT only
        fc.record({
          url: fc.constant('https://test.supabase.co'),
          secretKey: invalidJwtArbitrary,
          projectRef: projectRefArbitrary
        }),
        // Both invalid
        fc.record({
          url: invalidUrlArbitrary,
          secretKey: invalidJwtArbitrary,
          projectRef: projectRefArbitrary
        })
      )

      fc.assert(
        fc.property(invalidConfigArbitrary, (config) => {
          const result = SupabaseConfigValidator.validate(config)

          // Property 1: Invalid configurations must fail validation
          expect(result.isValid).toBe(false)

          // Property 2: Must have at least one error or warning
          const totalIssues = result.errors.length + result.warnings.length
          expect(totalIssues).toBeGreaterThan(0)

          // Property 3: Error messages must be descriptive (non-empty strings)
          result.errors.forEach((error) => {
            expect(error).toBeTruthy()
            expect(typeof error).toBe('string')
            expect(error.length).toBeGreaterThan(0)
          })

          // Property 4: Warnings must be descriptive if present
          result.warnings.forEach((warning) => {
            expect(warning).toBeTruthy()
            expect(typeof warning).toBe('string')
            expect(warning.length).toBeGreaterThan(0)
          })

          // Property 5: Specific validation checks
          // If URL is invalid, should have URL error
          try {
            const urlObj = new URL(config.url)
            if (!urlObj.hostname.includes('supabase')) {
              expect(result.errors.some((e) => e.includes('SUPABASE_URL'))).toBe(true)
            }
          } catch {
            expect(result.errors.some((e) => e.includes('SUPABASE_URL'))).toBe(true)
          }

          // If JWT is invalid, should have JWT error
          if (!config.secretKey.startsWith('eyJ')) {
            expect(result.errors.some((e) => e.includes('SB_SECRET_KEY'))).toBe(true)
          }
        }),
        {
          numRuns: 100, // Run 100+ iterations as specified
          verbose: true // Show counterexamples if any fail
        }
      )
    })

    /**
     * Property: Mismatched project refs generate warnings but not errors
     *
     * Configurations with valid URL and JWT but mismatched project refs
     * should pass validation (isValid=true) but include warnings.
     */
    it('should generate warnings for mismatched project refs without failing validation', () => {
      const mismatchedRefArbitrary = fc
        .tuple(
          fc.stringMatching(/^[a-z0-9]{8,20}$/), // project ref in URL
          fc.stringMatching(/^[a-z0-9]{8,20}$/) // different project ref
        )
        .filter(([ref1, ref2]) => ref1 !== ref2)
        .map(([urlRef, configRef]) => ({
          url: `https://${urlRef}.supabase.co`,
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: configRef
        }))

      fc.assert(
        fc.property(mismatchedRefArbitrary, (config) => {
          const result = SupabaseConfigValidator.validate(config)

          // Property: Should pass validation (no errors)
          expect(result.isValid).toBe(true)
          expect(result.errors).toHaveLength(0)

          // Property: Should have a warning about mismatched refs
          expect(result.warnings.length).toBeGreaterThan(0)
          expect(result.warnings.some((w) => w.includes('PROJECT_REF'))).toBe(true)
        }),
        {
          numRuns: 100,
          verbose: true
        }
      )
    })

    /**
     * Property: Valid configurations should pass validation
     *
     * This is a complementary test to ensure the validator doesn't reject
     * valid configurations (no false positives).
     */
    it('should accept all valid configurations', () => {
      // Generator for valid JWT keys
      const validJwtArbitrary = fc
        .string({ minLength: 10, maxLength: 200 })
        .map((payload) => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}`)

      // Generator for matching project refs
      const validConfigArbitrary = fc
        .stringMatching(/^[a-z0-9]{8,20}$/)
        .chain((projectRef) =>
          fc.record({
            url: fc.constant(`https://${projectRef}.supabase.co`),
            secretKey: validJwtArbitrary,
            projectRef: fc.constant(projectRef)
          })
        )

      fc.assert(
        fc.property(validConfigArbitrary, (config) => {
          const result = SupabaseConfigValidator.validate(config)

          // Property: Valid configurations must pass validation
          expect(result.isValid).toBe(true)
          expect(result.errors).toHaveLength(0)
          expect(result.warnings).toHaveLength(0)
        }),
        {
          numRuns: 100,
          verbose: true
        }
      )
    })

    /**
     * Property: Validation is deterministic
     *
     * Running validation multiple times on the same config should produce
     * the same result.
     */
    it('should produce consistent results for the same configuration', () => {
      const configArbitrary = fc.record({
        url: fc.oneof(
          fc.webUrl(),
          fc.string()
        ),
        secretKey: fc.string(),
        projectRef: fc.string()
      })

      fc.assert(
        fc.property(configArbitrary, (config) => {
          const result1 = SupabaseConfigValidator.validate(config)
          const result2 = SupabaseConfigValidator.validate(config)

          // Property: Results must be identical
          expect(result1.isValid).toBe(result2.isValid)
          expect(result1.errors).toEqual(result2.errors)
          expect(result1.warnings).toEqual(result2.warnings)
        }),
        {
          numRuns: 100,
          verbose: true
        }
      )
    })

    /**
     * Property: Error messages are unique and specific
     *
     * Each type of validation failure should produce a distinct error message.
     */
    it('should produce specific error messages for different validation failures', () => {
      fc.assert(
        fc.property(
          fc.record({
            url: fc.string(),
            secretKey: fc.string(),
            projectRef: fc.string()
          }),
          (config) => {
            const result = SupabaseConfigValidator.validate(config)

            // Property: No duplicate error messages
            const uniqueErrors = new Set(result.errors)
            expect(uniqueErrors.size).toBe(result.errors.length)

            // Property: No duplicate warnings
            const uniqueWarnings = new Set(result.warnings)
            expect(uniqueWarnings.size).toBe(result.warnings.length)

            // Property: Error messages should mention the field they're validating
            result.errors.forEach((error) => {
              const mentionsField =
                error.includes('SUPABASE_URL') ||
                error.includes('SB_SECRET_KEY') ||
                error.includes('PROJECT_REF')
              expect(mentionsField).toBe(true)
            })
          }
        ),
        {
          numRuns: 100,
          verbose: true
        }
      )
    })
  })
})
