/**
 * @jest-environment jsdom
 */

import type { TenantInput } from '@repo/shared/types/core'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
	useAsyncTenantValidation,
	useConditionalTenantFields,
	useMultiStepTenantForm,
	useTenantFieldTransformers,
	useTenantForm,
	useTenantFormComplete,
	useTenantUpdateForm,
	useTenantValidation
} from '../use-tenant-form'

// Mock validation schema
jest.mock('@repo/shared/validation/tenants', () => ({
	tenantFormSchema: {
		parse: jest.fn(data => data)
	}
}))

describe('useTenantForm', () => {
	it('initializes with default values', () => {
		const { result } = renderHook(() => useTenantForm())

		expect(result.current.state.values).toEqual({
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			emergencyContact: '',
			avatarUrl: null,
			userId: null
		})
	})

	it('initializes with custom initial values', () => {
		const initialValues: Partial<TenantInput> = {
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com'
		}

		const { result } = renderHook(() => useTenantForm(initialValues))

		expect(result.current.state.values.firstName).toBe('John')
		expect(result.current.state.values.lastName).toBe('Doe')
		expect(result.current.state.values.email).toBe('john@example.com')
	})

	it('resets form to default values', () => {
		const { result } = renderHook(() => useTenantForm())

		act(() => {
			result.current.setFieldValue('firstName', 'Test')
			result.current.setFieldValue('email', 'test@example.com')
		})

		expect(result.current.state.values.firstName).toBe('Test')

		act(() => {
			result.current.reset()
		})

		expect(result.current.state.values.firstName).toBe('')
		expect(result.current.state.values.email).toBe('')
	})
})

describe('useTenantUpdateForm', () => {
	it('initializes with nullable fields', () => {
		const { result } = renderHook(() => useTenantUpdateForm())

		expect(result.current.state.values).toEqual({
			firstName: null,
			lastName: null,
			email: null,
			phone: null,
			emergencyContact: null,
			avatarUrl: null
		})
	})

	it('accepts partial initial values', () => {
		const initialValues = {
			firstName: 'Updated',
			phone: '(555) 123-4567'
		}

		const { result } = renderHook(() => useTenantUpdateForm(initialValues))

		expect(result.current.state.values.firstName).toBe('Updated')
		expect(result.current.state.values.phone).toBe('(555) 123-4567')
		expect(result.current.state.values.email).toBeNull()
	})
})

describe('useTenantValidation', () => {
	it('validates email correctly', () => {
		const { result } = renderHook(() => useTenantValidation())

		// Valid email
		expect(result.current.validateEmail('test@example.com')).toBeUndefined()

		// Invalid email - missing @
		expect(result.current.validateEmail('invalid-email')).toEqual({
			email: 'Please enter a valid email address'
		})

		// Invalid email - empty
		expect(result.current.validateEmail('')).toEqual({
			email: 'Email is required'
		})
	})

	it('validates phone number correctly', () => {
		const { result } = renderHook(() => useTenantValidation())

		// Valid phone numbers
		expect(result.current.validatePhone('(555) 123-4567')).toBeUndefined()
		expect(result.current.validatePhone('555-123-4567')).toBeUndefined()
		expect(result.current.validatePhone('+1 555 123 4567')).toBeUndefined()

		// Invalid phone - too short
		expect(result.current.validatePhone('123')).toEqual({
			phone: 'Please enter a valid phone number'
		})

		// Empty phone is valid (optional field)
		expect(result.current.validatePhone('')).toBeUndefined()
	})

	it('validates name correctly', () => {
		const { result } = renderHook(() => useTenantValidation())

		// Valid name
		expect(result.current.validateName('John')).toBeUndefined()

		// Invalid - empty
		expect(result.current.validateName('')).toEqual({
			firstName: 'First name is required'
		})

		// Invalid - too short
		expect(result.current.validateName('A')).toEqual({
			firstName: 'Name must be at least 2 characters'
		})

		// Invalid - too long
		const longName = 'A'.repeat(51)
		expect(result.current.validateName(longName)).toEqual({
			firstName: 'Name must be less than 50 characters'
		})
	})
})

describe('useTenantFieldTransformers', () => {
	it('formats phone numbers correctly', () => {
		const { result } = renderHook(() => useTenantFieldTransformers())

		expect(result.current.formatPhoneNumber('5551234567')).toBe(
			'(555) 123-4567'
		)
		expect(result.current.formatPhoneNumber('555')).toBe('555')
		expect(result.current.formatPhoneNumber('555123')).toBe('(555) 123')
	})

	it('capitalizes names correctly', () => {
		const { result } = renderHook(() => useTenantFieldTransformers())

		expect(result.current.capitalizeNames('john doe')).toBe('John Doe')
		expect(result.current.capitalizeNames('JANE SMITH')).toBe('Jane Smith')
		expect(result.current.capitalizeNames('mary-jane watson')).toBe(
			'Mary-jane Watson'
		)
	})

	it('normalizes email addresses', () => {
		const { result } = renderHook(() => useTenantFieldTransformers())

		expect(result.current.normalizeEmail('Test@Example.COM  ')).toBe(
			'test@example.com'
		)
		expect(result.current.normalizeEmail('  USER@DOMAIN.ORG')).toBe(
			'user@domain.org'
		)
	})
})

describe('useAsyncTenantValidation', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('checks email availability successfully', async () => {
		;(global.fetch as jest.Mock).mockResolvedValueOnce({
			json: async () => ({ available: true })
		})

		const { result } = renderHook(() => useAsyncTenantValidation())

		const isAvailable =
			await result.current.checkEmailAvailability('new@example.com')

		expect(isAvailable).toBe(true)
		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining(
				'http://localhost:3001/api/v1/tenants/check-email?email=new%40example.com'
			)
		)
	})

	it('handles email already in use', async () => {
		;(global.fetch as jest.Mock).mockResolvedValueOnce({
			json: async () => ({ available: false })
		})

		const { result } = renderHook(() => useAsyncTenantValidation())

		const validationResult = await result.current.validateEmailAsync(
			'existing@example.com'
		)

		expect(validationResult).toEqual({
			email: 'This email is already in use'
		})
	})

	it('handles validation error gracefully', async () => {
		;(global.fetch as jest.Mock).mockRejectedValueOnce(
			new Error('Network error')
		)

		const { result } = renderHook(() => useAsyncTenantValidation())

		const isAvailable =
			await result.current.checkEmailAvailability('test@example.com')

		expect(isAvailable).toBe(true) // Assumes available on error
	})

	it('tracks validation state', async () => {
		;(global.fetch as jest.Mock).mockImplementation(
			() =>
				new Promise(resolve =>
					setTimeout(
						() => resolve({ json: async () => ({ available: true }) }),
						100
					)
				)
		)

		const { result } = renderHook(() => useAsyncTenantValidation())

		const promise = result.current.checkEmailAvailability('test@example.com')

		// Should be validating
		await waitFor(() => {
			expect(result.current.isValidating.email).toBe(true)
		})

		await promise

		// Should be done validating
		await waitFor(() => {
			expect(result.current.isValidating.email).toBe(false)
		})
	})
})

describe('useConditionalTenantFields', () => {
	it('shows emergency contact when phone is provided', () => {
		const { result } = renderHook(() =>
			useConditionalTenantFields({ phone: '(555) 123-4567' })
		)

		expect(result.current.shouldShowEmergencyContact).toBe(true)
	})

	it('hides emergency contact when phone is empty', () => {
		const { result } = renderHook(() =>
			useConditionalTenantFields({ phone: '' })
		)

		expect(result.current.shouldShowEmergencyContact).toBe(false)
	})

	it('shows avatar when email and firstName are provided', () => {
		const { result } = renderHook(() =>
			useConditionalTenantFields({
				firstName: 'John',
				email: 'john@example.com'
			})
		)

		expect(result.current.shouldShowAvatar).toBe(true)
	})

	it('tracks basic info completion', () => {
		const { result: incompleteResult } = renderHook(() =>
			useConditionalTenantFields({
				firstName: 'John',
				lastName: ''
			})
		)

		expect(incompleteResult.current.isBasicInfoComplete).toBe(false)

		const { result: completeResult } = renderHook(() =>
			useConditionalTenantFields({
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com'
			})
		)

		expect(completeResult.current.isBasicInfoComplete).toBe(true)
	})
})

describe('useMultiStepTenantForm', () => {
	it('initializes at step 0 with 0% progress', () => {
		const { result } = renderHook(() => useMultiStepTenantForm())

		expect(result.current.currentStep).toBe(0)
		expect(result.current.progress).toBeCloseTo(0.33) // (0 + 1) / 3
	})

	it('advances to next step', () => {
		const { result } = renderHook(() => useMultiStepTenantForm())

		act(() => {
			result.current.nextStep()
		})

		expect(result.current.currentStep).toBe(1)
		expect(result.current.progress).toBeCloseTo(0.6666666666666666, 5) // (1 + 1) / 3
	})

	it('goes back to previous step', () => {
		const { result } = renderHook(() => useMultiStepTenantForm())

		act(() => {
			result.current.nextStep()
			result.current.nextStep()
		})

		expect(result.current.currentStep).toBe(2)

		act(() => {
			result.current.prevStep()
		})

		expect(result.current.currentStep).toBe(1)
	})

	it('does not go below step 0', () => {
		const { result } = renderHook(() => useMultiStepTenantForm())

		act(() => {
			result.current.prevStep()
			result.current.prevStep()
		})

		expect(result.current.currentStep).toBe(0)
	})

	it('updates form data across steps', () => {
		const { result } = renderHook(() => useMultiStepTenantForm())

		act(() => {
			result.current.updateFormData({
				firstName: 'John',
				lastName: 'Doe'
			})
		})

		expect(result.current.form.state.values.firstName).toBe('John')
		expect(result.current.form.state.values.lastName).toBe('Doe')
	})
})

describe('useTenantFormComplete', () => {
	it('provides complete form functionality', () => {
		const { result } = renderHook(() => useTenantFormComplete())

		expect(result.current.form).toBeDefined()
		expect(result.current.validation).toBeDefined()
		expect(result.current.formState).toBeDefined()
		expect(result.current.reset).toBeDefined()
	})

	it('resets both form and state', () => {
		const { result } = renderHook(() => useTenantFormComplete())

		act(() => {
			result.current.form.setFieldValue('firstName', 'Test')
			result.current.formState.setIsSubmitting(true)
			result.current.formState.setError('Test error')
		})

		expect(result.current.form.state.values.firstName).toBe('Test')
		expect(result.current.formState.isSubmitting).toBe(true)
		expect(result.current.formState.error).toBe('Test error')

		act(() => {
			result.current.reset()
		})

		expect(result.current.form.state.values.firstName).toBe('')
		expect(result.current.formState.isSubmitting).toBe(false)
		expect(result.current.formState.error).toBeNull()
	})

	it('initializes with custom values', () => {
		const initialValues: Partial<TenantInput> = {
			firstName: 'Jane',
			email: 'jane@example.com'
		}

		const { result } = renderHook(() => useTenantFormComplete(initialValues))

		expect(result.current.form.state.values.firstName).toBe('Jane')
		expect(result.current.form.state.values.email).toBe('jane@example.com')
	})
})
