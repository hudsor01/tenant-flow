/**
 * Toast store tests to ensure notification behavior stays production-accurate.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from '#stores/toast-store'

const resetToastStore = () => {
	useToastStore.setState({
		toasts: [],
		toastHistory: []
	})
}

describe('toast store', () => {
	beforeEach(() => {
		resetToastStore()
	})

	it('adds and removes toasts while updating history', () => {
		const store = useToastStore.getState()
		const toastId = store.addToast({
			title: 'Lease saved',
			description: 'Lease updated successfully',
			type: 'success'
		})

		let state = useToastStore.getState()
		expect(toastId).toMatch(/^toast_/)
		expect(state.toastCount).toBe(1)
		expect(state.toastHistory).toHaveLength(1)

		store.removeToast(toastId)
		state = useToastStore.getState()
		expect(state.toastCount).toBe(0)
		expect(state.toastHistory).toHaveLength(1)
	})

	it('clears toasts by category and priority', () => {
		const store = useToastStore.getState()
		store.addToast({
			title: 'Lease saved',
			description: 'Primary toast',
			type: 'success',
			category: 'leases'
		})
		store.addToast({
			title: 'Another',
			description: 'Secondary toast',
			type: 'info',
			category: 'leases',
			priority: 'high'
		})

		store.clearToasts('leases')
		expect(useToastStore.getState().toastCount).toBe(0)

		store.addToast({
			title: 'Warning',
			description: 'Check input',
			type: 'warning',
			priority: 'low'
		})
		store.addToast({
			title: 'Error',
			description: 'Bad request',
			type: 'error',
			priority: 'low'
		})
		store.dismissPriority('low')
		expect(useToastStore.getState().toastCount).toBe(0)
	})

	it('filters toasts by category, priority, and persistence', () => {
		const store = useToastStore.getState()
		store.addToast({
			title: 'Persistent',
			description: 'Stay visible',
			type: 'info',
			category: 'billing',
			persistent: true
		})
		store.addToast({
			title: 'High priority',
			description: 'Needs attention',
			type: 'warning',
			category: 'billing',
			priority: 'high'
		})

		const byCategory = store.getToastsByCategory('billing')
		expect(byCategory).toHaveLength(2)
		expect(store.getToastsByPriority('high')).toHaveLength(1)
		expect(store.getPersistentToasts()).toHaveLength(1)
	})

	it('tracks aggregate toast state', () => {
		const store = useToastStore.getState()
		store.addToast({
			title: 'Heads up',
			description: 'Check this',
			type: 'warning'
		})
		store.addToast({
			title: 'Error',
			description: 'Something failed',
			type: 'error'
		})

		const state = useToastStore.getState()
		expect(state.hasToasts).toBe(true)
		expect(state.hasWarnings).toBe(true)
		expect(state.hasErrors).toBe(true)
	})
})
