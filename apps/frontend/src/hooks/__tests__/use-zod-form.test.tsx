/**
 * Comprehensive tests for useZodForm hook and Zod validation integration
 */
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from '../use-zod-form'

// Test schemas for comprehensive validation
const simpleSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Invalid email'),
	age: z.number().min(0, 'Age must be positive')
})

const complexSchema = z.object({
	title: z.string().min(3, 'Title must be at least 3 characters').max(100),
	description: z.string().max(500, 'Description too long').optional(),
	tags: z.array(z.string()).min(1, 'At least one tag required'),
	published: z.boolean().default(false),
	metadata: z.object({
		category: z.enum(['tech', 'business', 'personal']),
		priority: z.number().min(1).max(5)
	})
})

describe('useZodForm Hook - Comprehensive Validation Tests', () => {
	describe('Basic Form Operations', () => {
		it('initializes with empty values and no errors', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			expect(result.current.values).toEqual({})
			expect(result.current.errors).toEqual({})
			expect(result.current.touched).toEqual({})
			expect(result.current.isValid).toBe(false)
			expect(result.current.isSubmitting).toBe(false)
			expect(result.current.isDirty).toBe(false)
		})

		it('initializes with provided initial values', () => {
			const initialValues = {
				name: 'John',
				email: 'john@test.com',
				age: 25
			}
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema, initialValues })
			)

			expect(result.current.values).toEqual(initialValues)
			expect(result.current.isDirty).toBe(false)
		})

		it('updates individual field values correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setValue('name', 'Jane')
				result.current.setValue('email', 'jane@test.com')
				result.current.setValue('age', 30)
			})

			expect(result.current.values).toEqual({
				name: 'Jane',
				email: 'jane@test.com',
				age: 30
			})
			expect(result.current.isDirty).toBe(true)
		})

		it('updates multiple values at once', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setValues({
					name: 'Bob',
					email: 'bob@test.com'
				})
			})

			expect(result.current.values.name).toBe('Bob')
			expect(result.current.values.email).toBe('bob@test.com')
		})
	})

	describe('Validation Logic', () => {
		it('validates required fields correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.validateForm()
			})

			expect(Object.keys(result.current.errors).length).toBeGreaterThan(0)
			expect(result.current.isValid).toBe(false)
		})

		it('validates email format correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setValue('email', 'invalid-email')
			})

			// Validate in a separate act to ensure state is updated
			act(() => {
				result.current.validateField('email')
			})

			expect(result.current.errors.email).toBe('Invalid email')
		})

		it('validates number ranges correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setValue('age', -5)
			})

			act(() => {
				result.current.validateField('age')
			})

			expect(result.current.errors.age).toBe('Age must be positive')
		})

		it('clears errors when validation passes', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			// First set invalid value
			act(() => {
				result.current.setValue('email', 'invalid')
			})

			act(() => {
				result.current.validateField('email')
			})
			expect(result.current.errors.email).toBe('Invalid email')

			// Then fix it
			act(() => {
				result.current.setValue('email', 'valid@test.com')
			})

			act(() => {
				result.current.validateField('email')
			})
			expect(result.current.errors.email).toBeUndefined()
		})

		it('validates complete form correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			// Set valid data
			act(() => {
				result.current.setValues({
					name: 'John',
					email: 'john@test.com',
					age: 25
				})
			})

			let isValid: boolean
			act(() => {
				isValid = result.current.validateForm()
			})

			expect(isValid!).toBe(true)
			expect(result.current.isValid).toBe(true)
		})
	})

	describe('Complex Schema Validation', () => {
		it('handles nested object validation', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: complexSchema })
			)

			act(() => {
				result.current.setValues({
					title: 'Test Title',
					tags: ['tech'],
					metadata: {
						category: 'tech' as const,
						priority: 3
					}
				})
			})

			let isValid: boolean
			act(() => {
				isValid = result.current.validateForm()
			})

			expect(isValid!).toBe(true)
		})

		it('validates array requirements', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: complexSchema })
			)

			act(() => {
				result.current.setValues({
					title: 'Test',
					tags: [], // Empty array should fail
					metadata: {
						category: 'tech' as const,
						priority: 3
					}
				})
			})

			act(() => {
				result.current.validateForm()
			})

			expect(result.current.errors['tags']).toBe(
				'At least one tag required'
			)
		})

		it('validates enum values correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: complexSchema })
			)

			act(() => {
				result.current.setValues({
					title: 'Test Title',
					tags: ['test'],
					metadata: {
						category: 'invalid' as 'tech' | 'business' | 'personal', // Invalid enum value
						priority: 1
					}
				})
			})

			act(() => {
				result.current.validateForm()
			})

			expect(result.current.errors['metadata.category']).toBeTruthy()
		})
	})

	describe('Form Submission', () => {
		it('handles successful form submission', async () => {
			const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema, onSubmit: mockOnSubmit })
			)

			act(() => {
				result.current.setValues({
					name: 'John',
					email: 'john@test.com',
					age: 25
				})
			})

			await act(async () => {
				const submitHandler = result.current.handleSubmit()
				await submitHandler()
			})

			expect(mockOnSubmit).toHaveBeenCalledWith({
				name: 'John',
				email: 'john@test.com',
				age: 25
			})
		})

		it('prevents submission when form is invalid', async () => {
			const mockOnSubmit = jest.fn()
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema, onSubmit: mockOnSubmit })
			)

			// Don't set any values - form should be invalid
			await act(async () => {
				const submitHandler = result.current.handleSubmit()
				await submitHandler()
			})

			expect(mockOnSubmit).not.toHaveBeenCalled()
			expect(Object.keys(result.current.errors).length).toBeGreaterThan(0)
		})

		it('shows loading state during submission', async () => {
			const mockOnSubmit = jest
				.fn()
				.mockImplementation(
					() => new Promise(resolve => setTimeout(resolve, 100))
				)

			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema, onSubmit: mockOnSubmit })
			)

			act(() => {
				result.current.setValues({
					name: 'John',
					email: 'john@test.com',
					age: 25
				})
			})

			// Start submission
			let submitPromise: Promise<void>
			await act(async () => {
				const submitHandler = result.current.handleSubmit()
				submitPromise = submitHandler()

				// Check loading state immediately after starting
				await Promise.resolve() // Allow state to update
			})

			// Now isSubmitting should be true
			expect(result.current.isSubmitting).toBe(true)

			// Wait for submission to complete
			await act(async () => {
				await submitPromise!
			})

			expect(result.current.isSubmitting).toBe(false)
		})
	})

	describe('Error Management', () => {
		it('allows manual error setting and clearing', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setError('name', 'Custom error message')
			})

			expect(result.current.errors.name).toBe('Custom error message')

			act(() => {
				result.current.clearError('name')
			})

			expect(result.current.errors.name).toBeUndefined()
		})

		it('clears all errors at once', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setErrors({
					name: 'Name error',
					email: 'Email error'
				})
			})

			expect(result.current.errors.name).toBe('Name error')
			expect(result.current.errors.email).toBe('Email error')

			act(() => {
				result.current.clearErrors()
			})

			expect(result.current.errors).toEqual({})
		})
	})

	describe('Form Reset', () => {
		it('resets form to initial values', () => {
			const initialValues = {
				name: 'John',
				email: 'john@test.com',
				age: 25
			}
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema, initialValues })
			)

			// Change values
			act(() => {
				result.current.setValue('name', 'Jane')
				result.current.setError('email', 'Test error')
			})

			expect(result.current.values.name).toBe('Jane')
			expect(result.current.errors.email).toBe('Test error')

			// Reset
			act(() => {
				result.current.reset()
			})

			expect(result.current.values).toEqual(initialValues)
			expect(result.current.errors).toEqual({})
			expect(result.current.touched).toEqual({})
			expect(result.current.isSubmitting).toBe(false)
		})

		it('resets form to new values', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			const newValues = { name: 'Bob', email: 'bob@test.com', age: 30 }

			act(() => {
				result.current.reset(newValues)
			})

			expect(result.current.values).toEqual(newValues)
		})
	})

	describe('Field Props Generation', () => {
		it('generates correct field props for form inputs', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			const fieldProps = result.current.getFieldProps('name')

			expect(fieldProps.name).toBe('name')
			expect(fieldProps.value).toBe('')
			expect(typeof fieldProps.onChange).toBe('function')
			expect(typeof fieldProps.onBlur).toBe('function')
			expect(fieldProps['aria-invalid']).toBe(false)
		})

		it('includes error attributes when field has error', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			act(() => {
				result.current.setError('name', 'Name is required')
			})

			const fieldProps = result.current.getFieldProps('name')

			expect(fieldProps.error).toBe('Name is required')
			expect(fieldProps['aria-invalid']).toBe(true)
			expect(fieldProps['aria-describedby']).toBe('name-error')
		})
	})

	describe('Zod Error Formatting', () => {
		it('formats Zod errors correctly', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			const testResult = result.current.safeValidate({
				name: '', // Invalid - required field
				email: 'invalid-email', // Invalid format
				age: -1 // Invalid - negative
			})

			expect(testResult.success).toBe(false)
			if (!testResult.success) {
				expect(testResult.errors).toHaveLength(3)
				expect(
					testResult.errors.some(err => err.field === 'name')
				).toBe(true)
				expect(
					testResult.errors.some(err => err.field === 'email')
				).toBe(true)
				expect(testResult.errors.some(err => err.field === 'age')).toBe(
					true
				)
			}
		})

		it('handles successful validation', () => {
			const { result } = renderHook(() =>
				useZodForm({ schema: simpleSchema })
			)

			const testResult = result.current.safeValidate({
				name: 'John',
				email: 'john@test.com',
				age: 25
			})

			expect(testResult.success).toBe(true)
			if (testResult.success) {
				expect(testResult.data).toEqual({
					name: 'John',
					email: 'john@test.com',
					age: 25
				})
			}
		})
	})
})
