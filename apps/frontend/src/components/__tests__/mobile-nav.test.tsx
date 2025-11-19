/**
 * @jest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import { MobileNav } from '../mobile-nav'

const mockPathname = vi.hoisted(() => ({ current: '/manage' })) as { current: string }

vi.mock('next/navigation', () => ({
	usePathname: () => mockPathname.current
}))

beforeAll(() => {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation(query => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		}))
	})
})

describe('MobileNav', () => {
	beforeEach(() => {
		mockPathname.current = '/manage'
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('renders four primary navigation links', () => {
		render(<MobileNav />)

		const navLinks = screen.getAllByRole('link', { name: /navigation$/i })
		expect(navLinks).toHaveLength(4)
	})

	it('marks the active link when pathname matches', () => {
		mockPathname.current = '/manage/properties'
		render(<MobileNav />)

		const propertiesLink = screen.getByRole('link', { name: /properties navigation/i })
		expect(propertiesLink).toHaveAttribute('aria-current', 'page')
	})
})
