/**
 * UI Store - Multi-Step Form State
 *
 * Follows Zustand best practices and CLAUDE.md guidelines:
 * - ONLY shared UI state that needs cross-component coordination
 * - Component-local state (useState) for: modals, loading, notifications
 * - URL state for: dialogs, filters (use nuqs)
 * - Sonner for: toast notifications
 * - TanStack Query for: data loading states
 *
 * This store handles ONLY multi-step form wizards that span multiple components.
 */

import { create } from 'zustand'

export type FormProgress = {
	currentStep: number
	totalSteps: number
	completedSteps: number[]
	formData: Record<string, unknown>
	formType: string | null
	modalId: string // Associated modal for modal-specific forms
}

type FormState = {
	formProgress: Record<string, FormProgress> // modalId -> FormProgress
	setFormProgress: (progress: Partial<FormProgress>) => void
	resetFormProgress: () => void
	nextStep: () => void
	previousStep: () => void
	completeStep: (stepNumber: number) => void
	setFormData: (data: Record<string, unknown>) => void

	// Modal-aware form operations
	setModalFormProgress: (
		modalId: string,
		progress: Partial<FormProgress>
	) => void
	resetModalFormProgress: (modalId: string) => void
	getModalFormProgress: (modalId: string) => FormProgress | null
}

const _initialFormProgress: FormProgress = {
	currentStep: 1,
	totalSteps: 1,
	completedSteps: [],
	formData: {},
	formType: null,
	modalId: 'default'
}

export const useUIStore = create<FormState>()((set, get) => ({
	formProgress: {},

	// Legacy methods for backward compatibility (use default modalId)
	setFormProgress: progress => {
		const defaultModalId = 'default'
		set(state => {
			const existing = state.formProgress[defaultModalId] || {
				currentStep: 1,
				totalSteps: 1,
				completedSteps: [],
				formData: {},
				formType: null,
				modalId: defaultModalId
			}
			return {
				formProgress: {
					...state.formProgress,
					[defaultModalId]: {
						...existing,
						...progress,
						modalId: defaultModalId
					}
				}
			}
		})
	},

	resetFormProgress: () => {
		const defaultModalId = 'default'
		set(state => ({
			formProgress: {
				...state.formProgress,
				[defaultModalId]: {
					currentStep: 1,
					totalSteps: 1,
					completedSteps: [],
					formData: {},
					formType: null,
					modalId: defaultModalId
				}
			}
		}))
	},

	nextStep: () => {
		const defaultModalId = 'default'
		set(state => {
			const currentProgress = state.formProgress[defaultModalId]
			if (!currentProgress) return state

			const nextStep = Math.min(
				currentProgress.currentStep + 1,
				currentProgress.totalSteps
			)
			return {
				formProgress: {
					...state.formProgress,
					[defaultModalId]: {
						...currentProgress,
						currentStep: nextStep
					}
				}
			}
		})
	},

	previousStep: () => {
		const defaultModalId = 'default'
		set(state => {
			const currentProgress = state.formProgress[defaultModalId]
			if (!currentProgress) return state

			const prevStep = Math.max(currentProgress.currentStep - 1, 1)
			return {
				formProgress: {
					...state.formProgress,
					[defaultModalId]: {
						...currentProgress,
						currentStep: prevStep
					}
				}
			}
		})
	},

	completeStep: stepNumber => {
		const defaultModalId = 'default'
		set(state => {
			const currentProgress = state.formProgress[defaultModalId]
			if (!currentProgress) return state

			return {
				formProgress: {
					...state.formProgress,
					[defaultModalId]: {
						...currentProgress,
						completedSteps: Array.from(
							new Set([...currentProgress.completedSteps, stepNumber])
						)
					}
				}
			}
		})
	},

	setFormData: data => {
		const defaultModalId = 'default'
		set(state => {
			const currentProgress = state.formProgress[defaultModalId]
			if (!currentProgress) return state

			return {
				formProgress: {
					...state.formProgress,
					[defaultModalId]: {
						...currentProgress,
						formData: { ...currentProgress.formData, ...data }
					}
				}
			}
		})
	},

	// Modal-aware form operations
	setModalFormProgress: (modalId, progress) => {
		set(state => {
			const existing = state.formProgress[modalId] || {
				currentStep: 1,
				totalSteps: 1,
				completedSteps: [],
				formData: {},
				formType: null,
				modalId
			}
			return {
				formProgress: {
					...state.formProgress,
					[modalId]: {
						...existing,
						...progress,
						modalId
					}
				}
			}
		})
	},

	resetModalFormProgress: modalId => {
		set(state => ({
			formProgress: {
				...state.formProgress,
				[modalId]: {
					currentStep: 1,
					totalSteps: 1,
					completedSteps: [],
					formData: {},
					formType: null,
					modalId
				}
			}
		}))
	},

	getModalFormProgress: (modalId): FormProgress | null => {
		const state = get()
		return state.formProgress[modalId] || null
	}
}))

// Stable selector
export const useFormProgress = () =>
	useUIStore(state => {
		const defaultProgress = state.formProgress['default'] || {
			currentStep: 1,
			totalSteps: 1,
			completedSteps: [],
			formData: {},
			formType: null,
			modalId: 'default'
		}
		const { currentStep, totalSteps, completedSteps, formData, formType } =
			defaultProgress
		return {
			currentStep,
			totalSteps,
			completedSteps,
			formData,
			formType,
			isFirstStep: currentStep === 1,
			isLastStep: currentStep === totalSteps,
			isStepCompleted: (step: number) => completedSteps.includes(step),
			progress: Math.round((currentStep / totalSteps) * 100)
		}
	})

// Helper hook for multi-step forms
export const useFormStep = () => {
	const { currentStep, totalSteps, completedSteps } = useFormProgress()
	const { nextStep, previousStep, completeStep } = useUIStore()

	return {
		currentStep,
		totalSteps,
		completedSteps,
		nextStep,
		previousStep,
		completeStep,
		isFirstStep: currentStep === 1,
		isLastStep: currentStep === totalSteps,
		isStepCompleted: (step: number) => completedSteps.includes(step)
	}
}
