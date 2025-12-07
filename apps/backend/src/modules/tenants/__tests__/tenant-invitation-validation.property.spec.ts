/**
 * Property-Based Tests for Tenant Invitation Validation
 *
 * Feature: tenant-invitation-403-fix
 * Tests validation error handling and duplicate email rejection
 */

import * as fc from 'fast-check'
import { inviteTenantRequestSchema } from '@repo/shared/validation/tenants'
import { ZodError } from 'zod'

describe('Tenant Invitation Validation - Property Tests', () => {
  // Schema validation is tested through the property tests below
  // No debug logging needed in production tests
  beforeAll(() => {
    // Test setup if needed
  })

  // Helper to validate invitation data
  const validateInvitation = (data: unknown) => {
    try {
      const result = inviteTenantRequestSchema.parse(data)
      // If we get here, validation passed
      return { success: true, error: null, data: result }
    } catch (error) {
      if (error instanceof ZodError) {
        // Validation failed as expected
        return { success: false, error: error.issues, data: null }
      }
      throw error
    }
  }

  // Sanity check test to verify schema is working
  describe('Schema Sanity Check', () => {
    it('should reject whitespace-only names', () => {
      const result = validateInvitation({
        tenantData: {
          email: 'test@example.com',
          first_name: '   ',
          last_name: 'Valid'
        },
        leaseData: {
          property_id: '00000000-0000-1000-8000-000000000000'
        }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).not.toBeNull()
    })

    it('should accept valid data', () => {
      const result = validateInvitation({
        tenantData: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '00000000-0000-1000-8000-000000000000'
        }
      })

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('Property 8: Invalid input returns validation errors', () => {
    /**
     * Feature: tenant-invitation-403-fix, Property 8: Invalid input returns validation errors
     * Validates: Requirements 5.2
     *
     * For any invitation request with invalid data (missing required fields, malformed email,
     * invalid UUID format), the system should return a 400 Bad Request error with specific
     * validation error messages describing what is invalid.
     */

    it('should reject invitations with invalid email format', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate invalid email strings
          fc.oneof(
            fc.constant(''),
            fc.constant('not-an-email'),
            fc.constant('missing@domain'),
            fc.constant('@nodomain.com'),
            fc.constant('spaces in@email.com'),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@'))
          ),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          async (invalidEmail, firstName, lastName, propertyId) => {
            const result = validateInvitation({
              tenantData: {
                email: invalidEmail,
                first_name: firstName,
                last_name: lastName
              },
              leaseData: {
                property_id: propertyId
              }
            })

            // Assert: Should fail validation
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
            // Should mention email validation
            const errorMessage = JSON.stringify(result.error).toLowerCase()
            expect(errorMessage).toMatch(/email/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invitations with missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          fc.uuid(),
          async (email, firstName, lastName, propertyId) => {
            // Skip if both names are provided (valid case)
            if (firstName && lastName) return

            const result = validateInvitation({
              tenantData: {
                email,
                first_name: firstName,
                last_name: lastName
              },
              leaseData: {
                property_id: propertyId
              }
            })

            // Assert: Should fail validation
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invitations with invalid UUID format for property_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate invalid UUID strings
          fc.oneof(
            fc.constant(''),
            fc.constant('not-a-uuid'),
            fc.constant('12345'),
            fc.string({ minLength: 1, maxLength: 30 }).filter(s =>
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
            )
          ),
          fc.emailAddress(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (invalidUuid, email, firstName, lastName) => {
            const result = validateInvitation({
              tenantData: {
                email,
                first_name: firstName,
                last_name: lastName
              },
              leaseData: {
                property_id: invalidUuid
              }
            })

            // Assert: Should fail validation
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
            // Should mention UUID validation
            const errorMessage = JSON.stringify(result.error).toLowerCase()
            expect(errorMessage).toMatch(/uuid|invalid/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invitations with empty string names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.oneof(
            fc.constant(''),
            fc.constant('   '), // whitespace only
            fc.constant('\t'),
            fc.constant('\n')
          ),
          fc.uuid(),
          async (email, emptyName, propertyId) => {
            const result = validateInvitation({
              tenantData: {
                email,
                first_name: emptyName,
                last_name: 'ValidName'
              },
              leaseData: {
                property_id: propertyId
              }
            })

            // Assert: Should fail validation
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invitations with names exceeding max length', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          // Generate strings that will still be > 100 chars AFTER trimming
          fc.string({ minLength: 101, maxLength: 200 }).filter(s => s.trim().length > 100),
          fc.uuid(),
          async (email, longName, propertyId) => {
            const result = validateInvitation({
              tenantData: {
                email,
                first_name: longName,
                last_name: 'ValidName'
              },
              leaseData: {
                property_id: propertyId
              }
            })

            // Assert: Should fail validation
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
            // Should mention length validation
            const errorMessage = JSON.stringify(result.error).toLowerCase()
            expect(errorMessage).toMatch(/100/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept valid invitation data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress().filter(email => {
            // Filter to emails that pass Zod validation
            try {
              inviteTenantRequestSchema.shape.tenantData.shape.email.parse(email)
              return true
            } catch {
              return false
            }
          }),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // Not all whitespace
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // Not all whitespace
          fc.uuid(),
          async (email, firstName, lastName, propertyId) => {
            const result = validateInvitation({
              tenantData: {
                email,
                first_name: firstName,
                last_name: lastName
              },
              leaseData: {
                property_id: propertyId
              }
            })

            // Assert: Should pass validation
            expect(result.success).toBe(true)
            expect(result.error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

})
