/**
 * UI Store Hooks
 *
 * Provides React hooks for interacting with the UI store.
 * Manages multi-step form wizards that span multiple components.
 */

import { useUIStore } from '#stores/ui-store'

/**
 * Hook to access the complete UI store
 */
export const useUI = () => {
	return useUIStore()
}

/**
 * Hook for form progress management
 */
export const useFormProgress = () => {
	const {
		formProgress,
		setFormProgress,
		resetFormProgress,
		nextStep,
		previousStep,
		completeStep,
		setFormData
	} = useUIStore()

	return {
		formProgress,
		setFormProgress,
		resetFormProgress,
		nextStep,
		previousStep,
		completeStep,
		setFormData
	}
}

/**
 * Hook for modal-specific form progress
 */
export const useModalFormProgress = (modalId: string) => {
	const {
		setModalFormProgress,
		resetModalFormProgress,
		getModalFormProgress
	} = useUIStore()

	const progress = getModalFormProgress(modalId)

	return {
		progress,
		setProgress: (progressData: Partial<Parameters<typeof setModalFormProgress>[1]>) =>
			setModalFormProgress(modalId, progressData),
		resetProgress: () => resetModalFormProgress(modalId)
	}
}

/**
 * Hook for current form step navigation
 */
export const useFormNavigation = (modalId?: string) => {
	const store = useUIStore()
	const progress = modalId ? store.getModalFormProgress(modalId) : null

	if (!progress) {
		return {
			canGoNext: false,
			canGoPrevious: false,
			currentStep: 1,
			totalSteps: 1,
			nextStep: () => {},
			previousStep: () => {}
		}
	}

	return {
		canGoNext: progress.currentStep < progress.totalSteps,
		canGoPrevious: progress.currentStep > 1,
		currentStep: progress.currentStep,
		totalSteps: progress.totalSteps,
		nextStep: () => {
			if (modalId) {
				store.setModalFormProgress(modalId, { currentStep: progress.currentStep + 1 })
			} else {
				store.nextStep()
			}
		},
		previousStep: () => {
			if (modalId) {
				store.setModalFormProgress(modalId, { currentStep: progress.currentStep - 1 })
			} else {
				store.previousStep()
			}
		}
	}
}