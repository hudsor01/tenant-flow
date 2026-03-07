import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks (available inside vi.mock factories) ─────

const { mockGetUser, mockFrom, mockSelect, mockEq, mockSingle } = vi.hoisted(
	() => ({
		mockGetUser: vi.fn(),
		mockFrom: vi.fn(),
		mockSelect: vi.fn(),
		mockEq: vi.fn(),
		mockSingle: vi.fn(),
	})
)

const { mockPaymentMethodsAttach, mockCustomersUpdate } = vi.hoisted(() => ({
	mockPaymentMethodsAttach: vi.fn(),
	mockCustomersUpdate: vi.fn(),
}))

// ── Module mocks ───────────────────────────────────────────

vi.mock('#lib/supabase/server', () => ({
	createClient: vi.fn(() =>
		Promise.resolve({
			auth: { getUser: mockGetUser },
			from: mockFrom,
		})
	),
}))

vi.mock('stripe', () => {
	const MockStripe = vi.fn(function (this: Record<string, unknown>) {
		this.paymentMethods = { attach: mockPaymentMethodsAttach }
		this.customers = { update: mockCustomersUpdate }
	})
	return { default: MockStripe }
})

vi.mock('#env', () => ({
	env: {
		STRIPE_SECRET_KEY: 'sk_test_mock_key',
		NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'mock-anon-key',
	},
}))

import { POST } from '../attach-payment-method/route'

// ── Helpers ────────────────────────────────────────────────

function buildRequest(body: Record<string, unknown> | null): Request {
	return new Request('http://localhost:3050/api/stripe/attach-payment-method', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : '{}',
	})
}

// ── Tests ──────────────────────────────────────────────────

describe('POST /api/stripe/attach-payment-method', () => {
	beforeEach(() => {
		vi.clearAllMocks()

		// Default: authenticated user
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'user-123', email: 'tenant@example.com' } },
			error: null,
		})

		// Default: tenant with stripe customer
		mockFrom.mockReturnValue({ select: mockSelect })
		mockSelect.mockReturnValue({ eq: mockEq })
		mockEq.mockReturnValue({ single: mockSingle })
		mockSingle.mockResolvedValue({
			data: { stripe_customer_id: 'cus_test123' },
			error: null,
		})

		// Default: Stripe operations succeed
		mockPaymentMethodsAttach.mockResolvedValue({ id: 'pm_test_abc' })
		mockCustomersUpdate.mockResolvedValue({ id: 'cus_test123' })
	})

	// ── Auth ──────────────────────────────────────────────

	it('returns 401 when auth.getUser() returns an error', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { message: 'invalid token' },
		})

		const response = await POST(buildRequest({ payment_method_id: 'pm_test' }))
		const data = await response.json()

		expect(response.status).toBe(401)
		expect(data.success).toBe(false)
		expect(data.error).toBe('Unauthorized')
	})

	it('returns 401 when no user is returned', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: null,
		})

		const response = await POST(buildRequest({ payment_method_id: 'pm_test' }))
		const data = await response.json()

		expect(response.status).toBe(401)
		expect(data.success).toBe(false)
		expect(data.error).toBe('Unauthorized')
	})

	// ── Validation ────────────────────────────────────────

	it('returns 400 when payment_method_id is missing', async () => {
		const response = await POST(buildRequest({}))
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.success).toBe(false)
		expect(data.error).toBe('payment_method_id is required')
	})

	it('returns 400 when payment_method_id is not a string', async () => {
		const response = await POST(buildRequest({ payment_method_id: 12345 }))
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.success).toBe(false)
		expect(data.error).toBe('payment_method_id is required')
	})

	it('returns 400 when payment_method_id is an empty string', async () => {
		const response = await POST(buildRequest({ payment_method_id: '' }))
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data.success).toBe(false)
		expect(data.error).toBe('payment_method_id is required')
	})

	// ── Tenant lookup ─────────────────────────────────────

	it('returns 404 when tenant has no stripe_customer_id', async () => {
		mockSingle.mockResolvedValue({
			data: { stripe_customer_id: null },
			error: null,
		})

		const response = await POST(buildRequest({ payment_method_id: 'pm_test' }))
		const data = await response.json()

		expect(response.status).toBe(404)
		expect(data.success).toBe(false)
		expect(data.error).toBe('No Stripe customer found for this tenant')
	})

	it('returns 404 when tenant lookup returns an error', async () => {
		mockSingle.mockResolvedValue({
			data: null,
			error: { message: 'not found' },
		})

		const response = await POST(buildRequest({ payment_method_id: 'pm_test' }))
		const data = await response.json()

		expect(response.status).toBe(404)
		expect(data.success).toBe(false)
		expect(data.error).toBe('No Stripe customer found for this tenant')
	})

	it('queries tenants table by authenticated user id', async () => {
		await POST(buildRequest({ payment_method_id: 'pm_test' }))

		expect(mockFrom).toHaveBeenCalledWith('tenants')
		expect(mockSelect).toHaveBeenCalledWith('stripe_customer_id')
		expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
		expect(mockSingle).toHaveBeenCalled()
	})

	// ── Success: attach + set as default ──────────────────

	it('attaches payment method and sets as default by default', async () => {
		const response = await POST(
			buildRequest({ payment_method_id: 'pm_test_abc' })
		)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.success).toBe(true)

		expect(mockPaymentMethodsAttach).toHaveBeenCalledWith('pm_test_abc', {
			customer: 'cus_test123',
		})
		expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_test123', {
			invoice_settings: { default_payment_method: 'pm_test_abc' },
		})
	})

	it('sets as default when set_as_default is explicitly true', async () => {
		const response = await POST(
			buildRequest({ payment_method_id: 'pm_test_abc', set_as_default: true })
		)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.success).toBe(true)
		expect(mockCustomersUpdate).toHaveBeenCalledOnce()
	})

	it('skips setting as default when set_as_default is false', async () => {
		const response = await POST(
			buildRequest({
				payment_method_id: 'pm_test_abc',
				set_as_default: false,
			})
		)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.success).toBe(true)

		expect(mockPaymentMethodsAttach).toHaveBeenCalledOnce()
		expect(mockCustomersUpdate).not.toHaveBeenCalled()
	})

	// ── Stripe errors ─────────────────────────────────────

	it('returns 500 when stripe.paymentMethods.attach() throws', async () => {
		mockPaymentMethodsAttach.mockRejectedValue(
			new Error('Your card was declined')
		)

		const response = await POST(
			buildRequest({ payment_method_id: 'pm_test_abc' })
		)
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.success).toBe(false)
		expect(data.error).toBeDefined()
	})

	it('returns 500 when stripe.customers.update() throws', async () => {
		mockCustomersUpdate.mockRejectedValue(new Error('No such customer'))

		const response = await POST(
			buildRequest({ payment_method_id: 'pm_test_abc' })
		)
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.success).toBe(false)
		expect(data.error).toBeDefined()
	})

	it('returns 500 with "Unknown error" when non-Error is thrown', async () => {
		mockPaymentMethodsAttach.mockRejectedValue('string error')

		const response = await POST(
			buildRequest({ payment_method_id: 'pm_test_abc' })
		)
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data.success).toBe(false)
		expect(data.error).toBe('Unknown error')
	})
})
