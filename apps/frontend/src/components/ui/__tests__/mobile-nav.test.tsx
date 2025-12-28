/**
 * @jest-environment jsdom
 */

import { render, screen } from '#test/utils/test-render'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import { MobileNav } from '../mobile-nav'

const mockPathname = vi.hoisted(() => ({ current: '/' })) as { current: string }

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
		mockPathname.current = '/'
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('renders four primary navigation links', () => {
		render(<MobileNav />)

		// Component renders 4 bottom nav links + 4 sheet menu links = 8 total
		// Just verify the main navigation items are present
		expect(
			screen.getByRole('link', { name: /dashboard navigation/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('link', { name: /properties navigation/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('link', { name: /tenants navigation/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('link', { name: /maintenance navigation/i })
		).toBeInTheDocument()
	})

	it('marks the active link when pathname matches', () => {
		mockPathname.current = '/properties'
		render(<MobileNav />)

		const propertiesLink = screen.getByRole('link', {
			name: /properties navigation/i
		})
		expect(propertiesLink).toHaveAttribute('aria-current', 'page')
	})
})
