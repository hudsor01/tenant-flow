/**
 * Navigation store tests to ensure routing state aligns with production usage.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore } from '#stores/navigation-store'

const resetNavigationStore = () => {
	useNavigationStore.setState({
		isMobileMenuOpen: false,
		breadcrumbs: [],
		navigationHistory: [],
		activeRoute: null,
		activeSection: null
	})
}

describe('navigation store', () => {
	beforeEach(() => {
		resetNavigationStore()
	})

	it('toggles the mobile menu state consistently', () => {
		const store = useNavigationStore.getState()
		expect(store.isMobileMenuOpen).toBe(false)

		store.toggleMobileMenu()
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(true)

		store.closeMobileMenu()
		expect(useNavigationStore.getState().isMobileMenuOpen).toBe(false)
	})

	it('manages breadcrumbs array', () => {
		const { setBreadcrumbs, addBreadcrumb, clearBreadcrumbs } =
			useNavigationStore.getState()
		setBreadcrumbs([{ label: 'Dashboard', href: '/dashboard' }])
		addBreadcrumb({ label: 'Leases', href: '/manage/leases' })

		let state = useNavigationStore.getState()
		expect(state.breadcrumbs).toHaveLength(2)
		expect(state.breadcrumbs[1]?.label).toBe('Leases')

		clearBreadcrumbs()
		state = useNavigationStore.getState()
		expect(state.breadcrumbs).toHaveLength(0)
	})

	it('tracks active route and navigation history', () => {
		const { setActiveRoute } = useNavigationStore.getState()
		setActiveRoute('/dashboard', 'overview')
		setActiveRoute('/manage/leases', 'leases')

		const state = useNavigationStore.getState()
		expect(state.activeRoute).toBe('/manage/leases')
		expect(state.activeSection).toBe('leases')
		expect(state.navigationHistory).toEqual(['/dashboard', '/manage/leases'])
		expect(state.canGoBack).toBe(true)
	})

	it('goes back to the previous history entry', () => {
		const { addToHistory, goBack } = useNavigationStore.getState()
		addToHistory('/dashboard')
		addToHistory('/manage/leases')
		addToHistory('/manage/leases/create')

		const previousRoute = goBack()
		expect(previousRoute).toBe('/manage/leases')
		expect(useNavigationStore.getState().activeRoute).toBe('/manage/leases')
		expect(useNavigationStore.getState().navigationHistory).toEqual([
			'/dashboard',
			'/manage/leases'
		])
	})

	it('clears navigation history', () => {
		const { addToHistory, clearHistory } = useNavigationStore.getState()
		addToHistory('/dashboard')
		addToHistory('/manage/leases')
		clearHistory()

		expect(useNavigationStore.getState().navigationHistory).toHaveLength(0)
		expect(useNavigationStore.getState().canGoBack).toBe(false)
	})
})
