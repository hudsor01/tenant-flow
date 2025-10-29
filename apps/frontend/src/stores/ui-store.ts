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
}

type FormState = {
	formProgress: FormProgress
	setFormProgress: (progress: Partial<FormProgress>) => void
	resetFormProgress: () => void
	nextStep: () => void
	previousStep: () => void
	completeStep: (stepNumber: number) => void
	setFormData: (data: Record<string, unknown>) => void
}

const initialFormProgress: FormProgress = {
	currentStep: 1,
	totalSteps: 1,
	completedSteps: [],
	formData: {},
	formType: null
}

export const useUIStore = create<FormState>(set => ({
	formProgress: initialFormProgress,

	setFormProgress: progress =>
		set(state => ({
			formProgress: { ...state.formProgress, ...progress }
		})),

	resetFormProgress: () => set({ formProgress: initialFormProgress }),

	nextStep: () =>
		set(state => ({
			formProgress: {
				...state.formProgress,
				currentStep: Math.min(
					state.formProgress.currentStep + 1,
					state.formProgress.totalSteps
				)
			}
		})),

	previousStep: () =>
		set(state => ({
			formProgress: {
				...state.formProgress,
				currentStep: Math.max(state.formProgress.currentStep - 1, 1)
			}
		})),

	completeStep: stepNumber =>
		set(state => ({
			formProgress: {
				...state.formProgress,
				completedSteps: Array.from(
					new Set([...state.formProgress.completedSteps, stepNumber])
				)
			}
		})),

	setFormData: data =>
		set(state => ({
			formProgress: {
				...state.formProgress,
				formData: { ...state.formProgress.formData, ...data }
			}
		}))
}))

// Stable selector
export const useFormProgress = () => useUIStore(state => state.formProgress)

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
