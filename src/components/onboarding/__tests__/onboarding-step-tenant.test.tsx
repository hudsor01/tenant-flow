/**
 * OnboardingStepTenant Migration Tests
 *
 * Validates that the onboarding wizard uses the unified useCreateInvitation hook
 * instead of an inline useMutation for invitation creation.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import * as fs from 'fs'

const mockMutateAsync = vi.hoisted(() => vi.fn())
const mockResendMutate = vi.hoisted(() => vi.fn())

vi.mock('#hooks/api/use-create-invitation', () => ({
	useCreateInvitation: () => ({
		mutateAsync: mockMutateAsync,
		isPending: false
	})
}))
vi.mock('#hooks/api/use-tenant-invite-mutations', () => ({
	useResendInvitationMutation: () => ({ mutate: mockResendMutate })
}))

describe('OnboardingStepTenant', () => {
	it('uses useCreateInvitation hook for invitation creation', async () => {
		const mod = await import('../onboarding-step-tenant')
		expect(mod).toBeDefined()
		expect(mod.OnboardingStepTenant).toBeDefined()
	})

	it('does not contain inline useMutation', () => {
		const source = fs.readFileSync(
			'src/components/onboarding/onboarding-step-tenant.tsx',
			'utf-8'
		)
		expect(source).toContain('useCreateInvitation')
		expect(source).not.toMatch(/useMutation\(\{/)
		expect(source).toContain('handleDuplicateInvitation')
	})
})
