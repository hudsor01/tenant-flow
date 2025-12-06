/**
 * SupabaseConfigValidator Tests
 *
 * Tests configuration validation logic for Supabase credentials.
 * Validates URL format, JWT format, and project ref consistency.
 *
 * Requirements: 1.2, 1.3, 5.2, 5.3
 */

import { SupabaseConfigValidator } from './supabase-config.validator'

describe('SupabaseConfigValidator', () => {
  describe('validate()', () => {
    describe('valid configurations', () => {
      it('should pass validation with valid Supabase URL, JWT, and matching project ref', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://abcdefgh.supabase.co',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'abcdefgh'
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.warnings).toHaveLength(0)
      })

      it('should pass validation with .supabase.in domain', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://testproject.supabase.in',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'testproject'
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('URL validation', () => {
      it('should reject invalid URL format', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'not-a-valid-url',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SUPABASE_URL must be a valid URL')
      })

      it('should reject non-Supabase URL', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://example.com',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SUPABASE_URL must be a Supabase URL (contains "supabase")')
      })

      it('should reject empty URL', () => {
        const result = SupabaseConfigValidator.validate({
          url: '',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SUPABASE_URL must be a valid URL')
      })
    })

    describe('secret key validation', () => {
      it('should accept modern secret key format (starts with sb_secret_)', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co',
          secretKey: 'sb_secret_ITkyo4Pcyz1234567890abcdefghijklmnopqrstuvwxyz',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should accept legacy JWT format (starts with eyJ)', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject invalid format (neither sb_secret_ nor eyJ)', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co',
          secretKey: 'not-a-valid-key',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
      })

      it('should reject empty secret key', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co',
          secretKey: '',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
      })

      it('should reject secret key with wrong prefix', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co',
          secretKey: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
      })

      it('should reject old sb_secret format without underscore', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co',
          secretKey: 'sbsecret123456',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
      })
    })

    describe('project ref validation', () => {
      it('should extract project ref from standard Supabase URL', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://myproject123.supabase.co',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'myproject123'
        })

        expect(result.isValid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should warn when project ref does not match URL', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://projectabc.supabase.co',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'projectxyz'
        })

        expect(result.isValid).toBe(true) // Only a warning, not an error
        expect(result.warnings).toContain(
          'PROJECT_REF (projectxyz) does not match URL project (projectabc)'
        )
      })

      it('should handle URL without extractable project ref', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://custom-supabase-instance.com',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'local'
        })

        // Should still validate (no warning if extraction fails)
        expect(result.isValid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should extract project ref from .supabase.in domain', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://indiaproject.supabase.in',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'indiaproject'
        })

        expect(result.isValid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })
    })

    describe('multiple validation errors', () => {
      it('should return all validation errors when multiple issues exist', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'not-a-url',
          secretKey: 'not-a-valid-key',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(2)
        expect(result.errors).toContain('SUPABASE_URL must be a valid URL')
        expect(result.errors).toContain('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
      })

      it('should combine errors and warnings', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://projectabc.supabase.co',
          secretKey: 'invalid-key-format',
          projectRef: 'projectxyz'
        })

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('SB_SECRET_KEY must be either a secret key (starts with "sb_secret_") or JWT (starts with "eyJ")')
        expect(result.warnings).toContain(
          'PROJECT_REF (projectxyz) does not match URL project (projectabc)'
        )
      })
    })

    describe('edge cases', () => {
      it('should handle URL with port number', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co:443',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(true)
      })

      it('should handle URL with path', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co/rest/v1',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(true)
      })

      it('should handle URL with query parameters', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://test.supabase.co?apikey=test',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'test'
        })

        expect(result.isValid).toBe(true)
      })

      it('should handle project ref with numbers', () => {
        const result = SupabaseConfigValidator.validate({
          url: 'https://abc123def456.supabase.co',
          secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          projectRef: 'abc123def456'
        })

        expect(result.isValid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })
    })
  })
})
