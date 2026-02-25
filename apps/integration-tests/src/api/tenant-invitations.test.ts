import { callEdgeFunction, isFunctionDeployed } from '../setup/edge-function-client'
import { checkEnv } from '../setup/env-check'

const env = checkEnv()

describe.skipIf(!env.supabaseConfigured)('tenant-invitation-validate', () => {
	let deployed = true

	beforeAll(async () => {
		deployed = await isFunctionDeployed('tenant-invitation-validate')
		if (!deployed) console.warn('tenant-invitation-validate not deployed — skipping')
	})

	it('returns 400 when code is missing', async () => {
		if (!deployed) return
		const result = await callEdgeFunction('tenant-invitation-validate', { body: {} })
		expect(result.status).toBe(400)
		const body = result.data as Record<string, unknown>
		expect(body.error).toBe('code is required')
	})

	it('returns 404 for nonexistent invitation code', async () => {
		if (!deployed) return
		const result = await callEdgeFunction('tenant-invitation-validate', {
			body: { code: 'NONEXISTENT_CODE_12345' },
		})
		expect(result.status).toBe(404)
		const body = result.data as Record<string, unknown>
		expect(body.error).toBe('Invalid or already used invitation')
	})
})

describe.skipIf(!env.supabaseConfigured)('tenant-invitation-accept', () => {
	let deployed = true

	beforeAll(async () => {
		deployed = await isFunctionDeployed('tenant-invitation-accept')
		if (!deployed) console.warn('tenant-invitation-accept not deployed — skipping')
	})

	it('returns 400 when code is missing', async () => {
		if (!deployed) return
		const result = await callEdgeFunction('tenant-invitation-accept', {
			body: { authuser_id: 'some-user-id' },
		})
		expect(result.status).toBe(400)
		const body = result.data as Record<string, unknown>
		expect(body.error).toBe('code and authuser_id are required')
	})

	it('returns 400 when authuser_id is missing', async () => {
		if (!deployed) return
		const result = await callEdgeFunction('tenant-invitation-accept', {
			body: { code: 'SOME_CODE' },
		})
		expect(result.status).toBe(400)
		const body = result.data as Record<string, unknown>
		expect(body.error).toBe('code and authuser_id are required')
	})

	it('returns 404 for nonexistent invitation code', async () => {
		if (!deployed) return
		const result = await callEdgeFunction('tenant-invitation-accept', {
			body: { code: 'NONEXISTENT_CODE_12345', authuser_id: 'fake-user-id' },
		})
		expect(result.status).toBe(404)
		const body = result.data as Record<string, unknown>
		expect(body.error).toBe('Invalid or already used invitation')
	})
})
