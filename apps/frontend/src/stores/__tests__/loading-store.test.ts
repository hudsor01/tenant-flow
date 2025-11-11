/**
 * Loading store unit tests to ensure global loading state mirrors production.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useLoadingStore } from '#stores/loading-store'

const resetLoadingStore = () => {
	useLoadingStore.setState({
		operations: {}
	})
}

describe('loading store', () => {
	beforeEach(() => {
		resetLoadingStore()
	})

	it('tracks loading lifecycle and toggles global flags', () => {
		const store = useLoadingStore.getState()
		store.startLoading('op-1', 'Sync leases', 'leases')

		let state = useLoadingStore.getState()
		expect(state.isLoading).toBe(true)
		expect(state.hasOperations).toBe(true)
		expect(state.operations['op-1']?.message).toBe('Sync leases')
		expect(state.operations['op-1']?.category).toBe('leases')

		store.stopLoading('op-1')
		state = useLoadingStore.getState()
		expect(state.isLoading).toBe(false)
		expect(state.hasOperations).toBe(false)
	})

	it('clamps progress values between 0 and 100', () => {
		const store = useLoadingStore.getState()
		store.startLoading('op-progress')
		store.updateProgress('op-progress', 150)
		expect(useLoadingStore.getState().operations['op-progress']?.progress).toBe(100)

		store.updateProgress('op-progress', -25)
		expect(useLoadingStore.getState().operations['op-progress']?.progress).toBe(0)
	})

	it('handles category-based operations consistently', () => {
		const store = useLoadingStore.getState()
		const firstId = store.startCategoryLoading('reports', 'Exporting')
		const secondId = store.startCategoryLoading('reports')

		expect(firstId).toContain('reports_')
		expect(secondId).toContain('reports_')
		expect(store.isCategoryLoading('reports')).toBe(true)
		expect(store.getOperationsByCategory('reports')).toHaveLength(2)

		store.stopCategoryLoading('reports')
		expect(store.isCategoryLoading('reports')).toBe(false)
		expect(store.getOperationsByCategory('reports')).toHaveLength(0)
	})

	it('computes aggregate progress across active operations', () => {
		const store = useLoadingStore.getState()
		store.startLoading('op-a')
		store.startLoading('op-b')
		store.updateProgress('op-a', 50)
		store.updateProgress('op-b', 100)

		expect(useLoadingStore.getState().globalProgress).toBe(75)
	})

	it('exposes helpers for accessing specific operations', () => {
		const store = useLoadingStore.getState()
		store.startLoading('op-detail', 'Loading tenant data', 'tenants')
		const operation = store.getOperation('op-detail')

		expect(operation?.id).toBe('op-detail')
		expect(store.getActiveOperations()).toHaveLength(1)
	})
})
