/**
 * Modal Store Hooks
 *
 * Provides React hooks for interacting with the modal store.
 * Follows the project's pattern of providing hooks for store interactions.
 */

import { useModalStore } from '#stores/modal-store'

/**
 * Hook to access modal store state and actions
 */
export const useModal = () => {
	return useModalStore()
}

/**
 * Hook to check if a specific modal is open
 */
export const useIsModalOpen = (modalId: string) => {
	return useModalStore(state => state.isModalOpen(modalId))
}

/**
 * Hook to get modal data for a specific modal
 */
export const useModalData = (modalId: string) => {
	return useModalStore(state => state.getModalData(modalId))
}

/**
 * Hook for modal actions (open, close, toggle)
 */
export const useModalActions = () => {
	const { openModal, closeModal, toggleModal, closeAllModals } = useModalStore()
	return { openModal, closeModal, toggleModal, closeAllModals }
}

/**
 * Hook to get the currently active modal
 */
export const useActiveModal = () => {
	return useModalStore(state => state.getActiveModal())
}

/**
 * Hook to check if any modals are open
 */
export const useHasOpenModals = () => {
	return useModalStore(state => state.hasOpenModals)
}
