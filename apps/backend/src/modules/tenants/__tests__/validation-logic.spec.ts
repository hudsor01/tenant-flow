/**
 * Unit Tests for Tenant Invitation Validation Logic
 *
 * Tests email format validation, required field validation, and UUID format validation
 * Requirements: 5.2
 */

import { inviteTenantRequestSchema } from '@repo/shared/validation/tenants'
import { ZodError } from 'zod'

describe('Tenant Invitation Validation Logic - Unit Tests', () => {
  describe('Email Format Validation', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com',
        'a@b.co'
      ]

      validEmails.forEach((email) => {
        const result = inviteTenantRequestSchema.safeParse({
          tenantData: {
            email,
            first_name: 'John',
            last_name: 'Doe'
          },
          leaseData: {
            property_id: '123e4567-e89b-12d3-a456-426614174000'
          }
        })

        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        '',
        'not-an-email',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'user@',
        '@example.com',
        'user..name@example.com',
        'user@.com',
        'user@domain',
        'user name@example.com'
      ]

      invalidEmails.forEach((email) => {
        const result = inviteTenantRequestSchema.safeParse({
          tenantData: {
            email,
            first_name: 'John',
            last_name: 'Doe'
          },
          leaseData: {
            property_id: '123e4567-e89b-12d3-a456-426614174000'
          }
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          const errorMessages = result.error.issues.map((issue) => issue.message).join(', ')
          expect(errorMessages.toLowerCase()).toContain('email')
        }
      })
    })

    it('should provide specific error message for invalid email', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'invalid-email',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailError = result.error.issues.find((issue) =>
          issue.path.includes('email')
        )
        expect(emailError).toBeDefined()
        expect(emailError?.message).toContain('email')
      }
    })
  })

  describe('Required Field Validation', () => {
    it('should accept request with all required fields', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(true)
    })

    it('should reject request missing email', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailError = result.error.issues.find((issue) =>
          issue.path.includes('email')
        )
        expect(emailError).toBeDefined()
      }
    })

    it('should reject request missing first_name', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstNameError = result.error.issues.find((issue) =>
          issue.path.includes('first_name')
        )
        expect(firstNameError).toBeDefined()
      }
    })

    it('should reject request missing last_name', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const lastNameError = result.error.issues.find((issue) =>
          issue.path.includes('last_name')
        )
        expect(lastNameError).toBeDefined()
      }
    })

    it('should reject request missing property_id', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {}
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const propertyIdError = result.error.issues.find((issue) =>
          issue.path.includes('property_id')
        )
        expect(propertyIdError).toBeDefined()
      }
    })

    it('should reject empty string for first_name', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: '',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstNameError = result.error.issues.find((issue) =>
          issue.path.includes('first_name')
        )
        expect(firstNameError).toBeDefined()
        expect(firstNameError?.message).toContain('required')
      }
    })

    it('should reject whitespace-only string for first_name', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: '   ',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstNameError = result.error.issues.find((issue) =>
          issue.path.includes('first_name')
        )
        expect(firstNameError).toBeDefined()
      }
    })

    it('should reject whitespace-only string for last_name', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: '   '
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const lastNameError = result.error.issues.find((issue) =>
          issue.path.includes('last_name')
        )
        expect(lastNameError).toBeDefined()
      }
    })

    it('should trim whitespace from names', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: '  John  ',
          last_name: '  Doe  '
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tenantData.first_name).toBe('John')
        expect(result.data.tenantData.last_name).toBe('Doe')
      }
    })

    it('should reject names exceeding 100 characters', () => {
      const longName = 'a'.repeat(101)
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: longName,
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstNameError = result.error.issues.find((issue) =>
          issue.path.includes('first_name')
        )
        expect(firstNameError).toBeDefined()
        expect(firstNameError?.message).toContain('100')
      }
    })

    it('should accept names at exactly 100 characters', () => {
      const maxLengthName = 'a'.repeat(100)
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: maxLengthName,
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(true)
    })
  })

  describe('UUID Format Validation', () => {
    it('should accept valid UUID v4 format for property_id', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
      ]

      validUUIDs.forEach((uuid) => {
        const result = inviteTenantRequestSchema.safeParse({
          tenantData: {
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe'
          },
          leaseData: {
            property_id: uuid
          }
        })

        expect(result.success).toBe(true)
      })
    })

    it('should accept valid UUID v4 format for unit_id', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000',
          unit_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
        }
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID formats for property_id', () => {
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '12345',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '123e4567e89b12d3a456426614174000', // Missing hyphens
        'gggggggg-gggg-gggg-gggg-gggggggggggg', // Invalid hex characters
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-4266141740000' // Too long
      ]

      invalidUUIDs.forEach((uuid) => {
        const result = inviteTenantRequestSchema.safeParse({
          tenantData: {
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe'
          },
          leaseData: {
            property_id: uuid
          }
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          const propertyIdError = result.error.issues.find((issue) =>
            issue.path.includes('property_id')
          )
          expect(propertyIdError).toBeDefined()
          expect(propertyIdError?.message.toLowerCase()).toMatch(/uuid|invalid/)
        }
      })
    })

    it('should reject invalid UUID formats for unit_id', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000',
          unit_id: 'not-a-uuid'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const unitIdError = result.error.issues.find((issue) =>
          issue.path.includes('unit_id')
        )
        expect(unitIdError).toBeDefined()
        expect(unitIdError?.message.toLowerCase()).toMatch(/uuid|invalid/)
      }
    })

    it('should provide specific error message for invalid UUID', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: 'invalid-uuid-format'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const propertyIdError = result.error.issues.find((issue) =>
          issue.path.includes('property_id')
        )
        expect(propertyIdError).toBeDefined()
        expect(propertyIdError?.message).toContain('UUID')
      }
    })

    it('should allow unit_id to be optional', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
          // unit_id is omitted
        }
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Phone Number Validation (Optional Field)', () => {
    it('should accept valid phone number formats', () => {
      const validPhones = [
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '+1 (123) 456-7890',
        '1234567890'
      ]

      validPhones.forEach((phone) => {
        const result = inviteTenantRequestSchema.safeParse({
          tenantData: {
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe',
            phone
          },
          leaseData: {
            property_id: '123e4567-e89b-12d3-a456-426614174000'
          }
        })

        expect(result.success).toBe(true)
      })
    })

    it('should reject phone numbers with invalid characters', () => {
      const invalidPhones = [
        'abc123',
        '123-456-789a',
        'phone#number'
      ]

      invalidPhones.forEach((phone) => {
        const result = inviteTenantRequestSchema.safeParse({
          tenantData: {
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe',
            phone
          },
          leaseData: {
            property_id: '123e4567-e89b-12d3-a456-426614174000'
          }
        })

        expect(result.success).toBe(false)
      })
    })

    it('should reject phone numbers that are too short', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '123'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const phoneError = result.error.issues.find((issue) =>
          issue.path.includes('phone')
        )
        expect(phoneError).toBeDefined()
        expect(phoneError?.message).toContain('10')
      }
    })

    it('should allow phone to be omitted', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe'
          // phone is omitted
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000'
        }
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Complete Validation Scenarios', () => {
    it('should reject request with multiple validation errors', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'invalid-email',
          first_name: '',
          last_name: 'a'.repeat(101)
        },
        leaseData: {
          property_id: 'not-a-uuid'
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // Should have multiple errors
        expect(result.error.issues.length).toBeGreaterThan(1)

        // Check for email error
        const emailError = result.error.issues.find((issue) =>
          issue.path.includes('email')
        )
        expect(emailError).toBeDefined()

        // Check for first_name error
        const firstNameError = result.error.issues.find((issue) =>
          issue.path.includes('first_name')
        )
        expect(firstNameError).toBeDefined()

        // Check for last_name error
        const lastNameError = result.error.issues.find((issue) =>
          issue.path.includes('last_name')
        )
        expect(lastNameError).toBeDefined()

        // Check for property_id error
        const propertyIdError = result.error.issues.find((issue) =>
          issue.path.includes('property_id')
        )
        expect(propertyIdError).toBeDefined()
      }
    })

    it('should accept completely valid request', () => {
      const result = inviteTenantRequestSchema.safeParse({
        tenantData: {
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1 (555) 123-4567'
        },
        leaseData: {
          property_id: '123e4567-e89b-12d3-a456-426614174000',
          unit_id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
        }
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tenantData.email).toBe('john.doe@example.com')
        expect(result.data.tenantData.first_name).toBe('John')
        expect(result.data.tenantData.last_name).toBe('Doe')
        expect(result.data.tenantData.phone).toBe('+1 (555) 123-4567')
        expect(result.data.leaseData.property_id).toBe('123e4567-e89b-12d3-a456-426614174000')
        expect(result.data.leaseData.unit_id).toBe('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6')
      }
    })
  })
})
