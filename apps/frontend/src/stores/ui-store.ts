import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { UIStore, FormProgress, ModalState, NotificationState } from '@repo/shared/types/frontend'

const initialFormProgress: FormProgress = {
  currentStep: 1,
  totalSteps: 1,
  completedSteps: [],
  formData: {},
  formType: null
}

const initialModalState: ModalState = {
  createProperty: false,
  createTenant: false,
  createLease: false,
  createMaintenance: false,
  editMode: null,
  viewMode: null,
  deleteConfirmation: null
}

const initialNotificationState: NotificationState = {
  show: false,
  type: 'info',
  title: '',
  message: '',
  duration: 5000
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set) => ({
    // Form Progress
    formProgress: initialFormProgress,

    setFormProgress: (progress) =>
      set((state) => ({
        formProgress: { ...state.formProgress, ...progress }
      })),

    resetFormProgress: () =>
      set({ formProgress: initialFormProgress }),

    nextStep: () =>
      set((state) => ({
        formProgress: {
          ...state.formProgress,
          currentStep: Math.min(
            state.formProgress.currentStep + 1,
            state.formProgress.totalSteps
          )
        }
      })),

    previousStep: () =>
      set((state) => ({
        formProgress: {
          ...state.formProgress,
          currentStep: Math.max(state.formProgress.currentStep - 1, 1)
        }
      })),

    completeStep: (stepNumber) =>
      set((state) => ({
        formProgress: {
          ...state.formProgress,
          completedSteps: Array.from(
            new Set([...state.formProgress.completedSteps, stepNumber])
          )
        }
      })),

    setFormData: (data) =>
      set((state) => ({
        formProgress: {
          ...state.formProgress,
          formData: { ...state.formProgress.formData, ...data }
        }
      })),

    // Modals
    modals: initialModalState,

    openModal: (modalType, data) =>
      set((state) => {
        const newModals = { ...state.modals }

        if (modalType === 'editMode' || modalType === 'viewMode') {
          newModals[modalType] = data as { type: string; id: string }
        } else if (modalType === 'deleteConfirmation') {
          newModals[modalType] = data as { type: string; id: string; name: string }
        } else {
          newModals[modalType] = true
        }

        return { modals: newModals }
      }),

    closeModal: (modalType) =>
      set((state) => {
        const newModals = { ...state.modals }

        if (modalType === 'editMode' || modalType === 'viewMode' || modalType === 'deleteConfirmation') {
          newModals[modalType] = null
        } else {
          newModals[modalType] = false
        }

        return { modals: newModals }
      }),

    closeAllModals: () =>
      set({ modals: initialModalState }),

    // Notifications
    notification: initialNotificationState,

    showNotification: (notification) =>
      set({ notification: { ...notification, show: true } }),

    hideNotification: () =>
      set({ notification: initialNotificationState }),

    // Loading States
    loading: {
      global: false,
      create: false,
      update: false,
      delete: false
    },

    setLoading: (type, state) =>
      set((prev) => ({
        loading: { ...prev.loading, [type]: state }
      })),

    // Refresh Triggers
    refreshTriggers: {
      properties: 0,
      tenants: 0,
      leases: 0,
      maintenance: 0,
      units: 0
    },

    triggerRefresh: (entity) =>
      set((state) => ({
        refreshTriggers: {
          ...state.refreshTriggers,
          [entity]: state.refreshTriggers[entity] + 1
        }
      }))
  }))
)

// Selectors for specific parts of the store
export const useFormProgress = () => useUIStore((state) => state.formProgress)
export const useModals = () => useUIStore((state) => state.modals)
export const useNotification = () => useUIStore((state) => state.notification)
export const useLoading = () => useUIStore((state) => state.loading)

// Helper hooks for common patterns
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

export const useModalControls = () => {
  const { openModal, closeModal, closeAllModals } = useUIStore()

  return {
    openModal,
    closeModal,
    closeAllModals,
    openCreateProperty: () => openModal('createProperty'),
    openCreateTenant: () => openModal('createTenant'),
    openEditMode: (type: string, id: string) => openModal('editMode', { type, id }),
    openViewMode: (type: string, id: string) => openModal('viewMode', { type, id }),
    openDeleteConfirmation: (type: string, id: string, name: string) =>
      openModal('deleteConfirmation', { type, id, name })
  }
}