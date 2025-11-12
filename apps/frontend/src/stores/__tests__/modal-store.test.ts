/**
 * Modal store unit tests to validate production behaviors.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useModalStore } from '#stores/modal-store'

const resetModalStore = () => {
	useModalStore.setState({
		modals: {},
		mutations: {},
		lazyContent: {},
		modalStack: [],
		activeModalStack: [],
		defaultCloseOnOutsideClick: true,
		defaultCloseOnEscape: true,
		defaultAutoFocus: true
	})
}

describe('modal store', () => {
	beforeEach(() => {
		resetModalStore()
	})

	it('opens modals with defaults, merges data, and updates stack', () => {
		const store = useModalStore.getState()
		store.openModal(
			'test-modal',
			{ context: 'lease' },
			{ type: 'alert', closeOnOutsideClick: false }
		)

		const state = useModalStore.getState()
		expect(state.isModalOpen('test-modal')).toBe(true)
		expect(state.getModalData('test-modal')).toMatchObject({ context: 'lease' })
		expect(state.modals['test-modal']?.type).toBe('alert')
		expect(state.modals['test-modal']?.closeOnOutsideClick).toBe(false)
		expect(state.modalStack).toEqual(['test-modal'])
	})

	it('maintains modal stack order and closes cleanly', () => {
		const store = useModalStore.getState()
		store.openModal('first')
		store.openModal('second')

		expect(store.getActiveModal()?.id).toBe('second')
		store.closeModal('second')
		expect(useModalStore.getState().modalStack).toEqual(['first'])

		store.closeAllModals()
		expect(useModalStore.getState().hasOpenModals).toBe(false)
		expect(useModalStore.getState().modalStack).toHaveLength(0)
	})

	it('resolves confirm modal promises on confirm and cancel', async () => {
		const store = useModalStore.getState()

		const confirmPromise = store.openConfirmModal({
			title: 'Confirm',
			message: 'Proceed?'
		})
		const confirmModalId = useModalStore.getState().modalStack.at(-1)!
		const confirmData = useModalStore.getState().modals[confirmModalId]
			?.data as { onConfirm: () => void }
		confirmData.onConfirm()
		await expect(confirmPromise).resolves.toBe(true)

		const cancelPromise = store.openConfirmModal({
			title: 'Cancel?',
			message: 'Are you sure?'
		})
		const cancelModalId = useModalStore.getState().modalStack.at(-1)!
		const cancelData = useModalStore.getState().modals[cancelModalId]
			?.data as { onCancel: () => void }
		cancelData.onCancel()
		await expect(cancelPromise).resolves.toBe(false)
	})

	it('respects navigation persistence rules', () => {
		const store = useModalStore.getState()
		store.openModal('persist', undefined, { persistThroughNavigation: true })
		store.openModal('transient')

		store.handleNavigation('/dashboard')
		const state = useModalStore.getState()
		expect(state.modals['persist']?.isOpen).toBe(true)
		expect(state.modals['transient']?.isOpen).toBe(false)
	})

	it('closes tracked modals when mutation succeeds', () => {
		const store = useModalStore.getState()
		store.openModal('tracked', undefined, { trackMutation: 'lease-save' })
		store.openModal('other', undefined, { trackMutation: 'other' })

		store.closeOnMutationSuccess('lease-save')
		const state = useModalStore.getState()
		expect(state.modals['tracked']?.isOpen).toBe(false)
		expect(state.modals['other']?.isOpen).toBe(true)
	})

	it('marks modal content as loaded only once', async () => {
		const store = useModalStore.getState()
		store.openModal('lazy', undefined, { lazyLoad: true })

		await store.loadModalContent('lazy')
		expect(useModalStore.getState().modals['lazy']?.isLoaded).toBe(true)

		// Calling again should leave state untouched
		await store.loadModalContent('lazy')
		expect(useModalStore.getState().modals['lazy']?.isLoaded).toBe(true)
	})
})
