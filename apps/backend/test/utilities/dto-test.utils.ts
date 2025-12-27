/**
 * DTO Test Utilities
 *
 * Helpers for testing DTOs with nestjs-zod validation and transformation.
 * Focuses on:
 * - Validation testing (required fields, format constraints)
 * - Transformation testing (snake_case → camelCase)
 * - Error cases and edge cases
 */

import { BadRequestException, HttpException } from '@nestjs/common'
import { ZodError } from 'zod'

/**
 * Test result from DTO validation
 */
export interface DTOTestResult<T> {
  isValid: boolean
  data?: T
  error?: ZodError | HttpException | Error
  errorMessages: string[]
}

/**
 * Validate a DTO and return detailed results
 *
 * @example
 * ```typescript
 * const result = await validateDTO(CreatePropertyDto, {
 *   name: 'Test Property',
 *   address: '123 Main St',
 *   city: 'Test City',
 *   state: 'TS',
 *   postal_code: '12345'
 * })
 *
 * expect(result.isValid).toBe(true)
 * expect(result.data?.name).toBe('Test Property')
 * ```
 */
type NewDTO<T> = new (data: unknown) => T

export async function validateDTO<T>(dtoClass: NewDTO<T>, data: unknown): Promise<DTOTestResult<T>> {
  try {
    // Create instance which triggers validation via nestjs-zod
    const instance = new dtoClass(data)
    return {
      isValid: true,
      data: instance as T,
      errorMessages: []
    }
  } catch (error: unknown) {
    const errorMessages: string[] = []

    if (error instanceof ZodError) {
      errorMessages.push(...error.errors.map((e) => `${e.path.join('.')}: ${e.message}`))
    } else if (error instanceof BadRequestException) {
      const response = error.getResponse() as unknown
      if (typeof response === 'object' && response && 'message' in response) {
        const msg = (response as { message?: string }).message
        if (Array.isArray(msg)) {
          errorMessages.push(...msg)
        } else {
          errorMessages.push(String(msg))
        }
      }
    } else if (error instanceof Error) {
      errorMessages.push(error.message)
    }

    return {
      isValid: false,
      error: error as ZodError | Error,
      errorMessages
    }
  }
}

/**
 * Expect DTO to be valid and return typed data
 *
 * @example
 * ```typescript
 * const dto = await expectValidDTO(CreatePropertyDto, {
 *   name: 'Test Property',
 *   address: '123 Main St',
 *   city: 'Test City',
 *   state: 'TS',
 *   postal_code: '12345'
 * })
 * expect(dto.name).toBe('Test Property')
 * ```
 */
export async function expectValidDTO<T>(dtoClass: NewDTO<T>, data: unknown): Promise<T> {
  const result = await validateDTO(dtoClass, data)
  if (!result.isValid) {
    throw new Error(`DTO validation failed: ${result.errorMessages.join('; ')}`)
  }
  return result.data as T
}

/**
 * Expect DTO to fail validation with specific error
 *
 * @example
 * ```typescript
 * const errors = await expectDTOError(
 *   CreatePropertyDto,
 *   { name: '' }, // Missing required fields
 *   'name'
 * )
 * expect(errors.some(e => e.includes('required'))).toBe(true)
 * ```
 */
export async function expectDTOError<T>(dtoClass: NewDTO<T>, data: unknown, expectedFieldPath?: string | string[]): Promise<string[]> {
  const result = await validateDTO(dtoClass, data)
  if (result.isValid) {
    throw new Error('Expected DTO validation to fail, but it passed')
  }

  if (expectedFieldPath) {
    const paths = Array.isArray(expectedFieldPath) ? expectedFieldPath : [expectedFieldPath]
    const hasExpectedPath = result.errorMessages.some((msg) => paths.some((path) => msg.includes(path)))
    if (!hasExpectedPath) {
      throw new Error(`Expected error for field(s) [${paths.join(', ')}], but got: ${result.errorMessages.join('; ')}`)
    }
  }

  return result.errorMessages
}

/**
 * Test DTO transformation (e.g., snake_case → camelCase)
 *
 * @example
 * ```typescript
 * const transformed = await expectDTOTransforms(
 *   CreatePropertyDto,
 *   { property_type: 'RESIDENTIAL' },
 *   { propertyType: 'RESIDENTIAL' }
 * )
 * ```
 */
export async function expectDTOTransforms<T>(dtoClass: NewDTO<T>, inputData: unknown, expectedTransformation: Partial<T>): Promise<T> {
  const dto = await expectValidDTO(dtoClass, inputData)

  for (const key of Object.keys(expectedTransformation) as Array<keyof T>) {
    const expectedValue = expectedTransformation[key]
    const actualValue = dto[key]
    if (actualValue !== expectedValue) {
      throw new Error(`Transformation failed for ${String(key)}: expected ${expectedValue}, got ${actualValue}`)
    }
  }

  return dto
}

/**
 * Test DTO computed properties
 *
 * @example
 * ```typescript
 * const dto = await expectValidDTO(UpdatePropertyDto, {
 *   name: 'New Name',
 *   address_line1: 'Old Address',
 *   new_address_line1: '123 New St'
 * })
 *
 * expectDTOComputed(dto, 'hasAddressChange', true)
 * ```
 */
export function expectDTOComputed<T>(dto: T, property: keyof T, expectedValue: unknown): void {
  const actualValue = dto[property]
  if (actualValue !== expectedValue) {
    throw new Error(`Computed property ${String(property)} expected ${String(expectedValue)}, got ${String(actualValue)}`)
  }
}

/**
 * Create a batch of test data for DTO testing
 *
 * @example
 * ```typescript
 * const testCases = createDTOTestBatch([
 *   { input: { name: '' }, shouldFail: true, field: 'name' },
 *   { input: { name: 'Valid' }, shouldFail: false }
 * ])
 * ```
 */
export interface DTOTestCase<T = unknown> {
  input: Partial<T> | unknown
  shouldFail: boolean
  expectedField?: string
  description?: string
}

/**
 * Run batch DTO validation tests
 */
export async function runDTOBatchTests<T>(dtoClass: NewDTO<T>, testCases: DTOTestCase<T>[]): Promise<void> {
  for (const testCase of testCases) {
    const result = await validateDTO(dtoClass, testCase.input)

    if (testCase.shouldFail) {
      if (result.isValid) {
        throw new Error(`Test case "${testCase.description || 'unnamed'}" expected to fail but passed`)
      }
      if (testCase.expectedField) {
        const hasExpectedField = result.errorMessages.some((msg) => msg.includes(testCase.expectedField!))
        if (!hasExpectedField) {
          throw new Error(`Test case "${testCase.description || 'unnamed'}" expected error on field ${testCase.expectedField}, got: ${result.errorMessages.join('; ')}`)
        }
      }
    } else {
      if (!result.isValid) {
        throw new Error(`Test case "${testCase.description || 'unnamed'}" expected to pass but failed: ${result.errorMessages.join('; ')}`)
      }
    }
  }
}

/**
 * Compare two DTO instances for equality
 * Useful when testing transformations
 */
export function compareDTOs<T>(dto1: T, dto2: T, fields: (keyof T)[]): boolean {
  for (const field of fields) {
    if (dto1[field] !== dto2[field]) {
      return false
    }
  }
  return true
}

/**
 * Create a partial DTO for testing
 * Useful for optional fields in DTOs
 */
export function createPartialDTO<T>(dtoClass: new (data: Partial<T>) => T, partialData: Partial<T>): T {
  return new dtoClass(partialData) as T
}

/**
 * Test DTO with all fields populated
 */
export async function expectCompleteDTO<T>(dtoClass: NewDTO<T>, data: unknown, requiredFields: (keyof T)[]): Promise<T> {
  const dto = await expectValidDTO(dtoClass, data)

  for (const field of requiredFields) {
    if (!dto[field]) {
      throw new Error(`Required field ${String(field)} is missing or falsy`)
    }
  }

  return dto
}

/**
 * Create a factory for generating test DTOs
 *
 * @example
 * ```typescript
 * const factory = createDTOFactory(CreatePropertyDto, {
 *   name: 'Default Property',
 *   address: '123 Main St',
 *   city: 'Test City',
 *   state: 'TS',
 *   postal_code: '12345'
 * })
 *
 * const dto1 = await factory.create()
 * const dto2 = await factory.create({ name: 'Custom Name' })
 * ```
 */
export function createDTOFactory<T>(dtoClass: NewDTO<T>, defaults: Partial<T>) {
  return {
    create: async (overrides?: Partial<T>): Promise<T> => {
      return expectValidDTO(dtoClass, { ...(defaults || {}), ...(overrides || {}) })
    },
    createInvalid: async (invalidData: Partial<T>): Promise<string[]> => {
      return expectDTOError(dtoClass, { ...(defaults || {}), ...(invalidData || {}) })
    }
  }
}
