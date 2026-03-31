import { describe, it, expect } from 'vitest'

describe('AcceptInvite session handling', () => {
	it('page source contains getUser() for session detection', async () => {
		const fs = await import('fs')
		const source = fs.readFileSync(
			'src/app/(auth)/accept-invite/page.tsx',
			'utf-8'
		)
		// Per D-08: session check on page load
		expect(source).toContain('getUser')
		// Per D-08: logged-in users see accept button
		expect(source).toContain('Accept Invitation')
		expect(source).toContain('Accepting...')
		// Per D-08: signed-in-as context
		expect(source).toContain('signed in as')
	})

	it('signup form contains login redirect link', async () => {
		const fs = await import('fs')
		const source = fs.readFileSync(
			'src/components/auth/accept-invite/invite-signup-form.tsx',
			'utf-8'
		)
		// Per D-09: login link with encoded redirect
		expect(source).toContain('Log in to accept')
		expect(source).toContain('encodeURIComponent')
		expect(source).toContain('/login?redirect=')
	})
})
