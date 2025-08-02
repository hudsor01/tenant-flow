import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { PropertyFormData } from '@tenantflow/shared/types/api-inputs'
import type { LeaseFormData } from '@/hooks/useLeaseForm'

// Form draft state for better UX during navigation
export interface FormDraftState {
  // Form drafts for preservation during navigation
  propertyFormDraft: Partial<PropertyFormData>
  leaseFormDraft: Partial<LeaseFormData>
  unitFormDraft: Partial<{
    unitNumber: string
    propertyId: string
    bedrooms: number
    bathrooms: number
    squareFeet: number
    rent: number
  }>
  tenantFormDraft: Partial<{
    name: string
    email: string
    phone: string
    propertyId: string
    unitId: string
  }>
  
  // Form state tracking
  formStates: Record<string, {
      isDirty: boolean
      hasErrors: boolean
      isSubmitting: boolean
      lastSaved: Date | null
    }>
  
  // Auto-save configuration
  autoSave: {
    enabled: boolean
    interval: number // milliseconds
    lastAutoSave: Date | null
  }
}

interface FormDraftActions {
  // Draft management
  savePropertyDraft: (draft: Partial<PropertyFormData>) => void
  saveLeaseDraft: (draft: Partial<LeaseFormData>) => void
  saveUnitDraft: (draft: Partial<FormDraftState['unitFormDraft']>) => void
  saveTenantDraft: (draft: Partial<FormDraftState['tenantFormDraft']>) => void
  
  // Clear drafts
  clearPropertyDraft: () => void
  clearLeaseDraft: () => void
  clearUnitDraft: () => void
  clearTenantDraft: () => void
  clearAllDrafts: () => void
  
  // Form state management
  setFormState: (formId: string, state: Partial<FormDraftState['formStates'][string]>) => void
  clearFormState: (formId: string) => void
  
  // Auto-save management
  setAutoSaveEnabled: (enabled: boolean) => void
  setAutoSaveInterval: (interval: number) => void
  updateLastAutoSave: () => void
  
  // Utility methods
  getFormDraft: <T extends keyof FormDraftState>(formType: T) => FormDraftState[T]
  hasUnsavedChanges: (formId?: string) => boolean
}

const initialState: FormDraftState = {
  propertyFormDraft: {},
  leaseFormDraft: {},
  unitFormDraft: {},
  tenantFormDraft: {},
  formStates: {},
  autoSave: {
    enabled: true,
    interval: 30000, // 30 seconds
    lastAutoSave: null,
  },
}

export const useFormStore = create<FormDraftState & FormDraftActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Draft management
        savePropertyDraft: (draft) => set((state) => {
          state.propertyFormDraft = { ...state.propertyFormDraft, ...draft }
          state.autoSave.lastAutoSave = new Date()
        }, false, 'savePropertyDraft'),
        
        saveLeaseDraft: (draft) => set((state) => {
          state.leaseFormDraft = { ...state.leaseFormDraft, ...draft }
          state.autoSave.lastAutoSave = new Date()
        }, false, 'saveLeaseDraft'),
        
        saveUnitDraft: (draft) => set((state) => {
          state.unitFormDraft = { ...state.unitFormDraft, ...draft }
          state.autoSave.lastAutoSave = new Date()
        }, false, 'saveUnitDraft'),
        
        saveTenantDraft: (draft) => set((state) => {
          state.tenantFormDraft = { ...state.tenantFormDraft, ...draft }
          state.autoSave.lastAutoSave = new Date()
        }, false, 'saveTenantDraft'),
        
        // Clear drafts
        clearPropertyDraft: () => set((state) => {
          state.propertyFormDraft = {}
        }, false, 'clearPropertyDraft'),
        
        clearLeaseDraft: () => set((state) => {
          state.leaseFormDraft = {}
        }, false, 'clearLeaseDraft'),
        
        clearUnitDraft: () => set((state) => {
          state.unitFormDraft = {}
        }, false, 'clearUnitDraft'),
        
        clearTenantDraft: () => set((state) => {
          state.tenantFormDraft = {}
        }, false, 'clearTenantDraft'),
        
        clearAllDrafts: () => set((state) => {
          state.propertyFormDraft = {}
          state.leaseFormDraft = {}
          state.unitFormDraft = {}
          state.tenantFormDraft = {}
          state.formStates = {}
        }, false, 'clearAllDrafts'),
        
        // Form state management
        setFormState: (formId, newState) => set((state) => {
          if (!state.formStates[formId]) {
            state.formStates[formId] = {
              isDirty: false,
              hasErrors: false,
              isSubmitting: false,
              lastSaved: null,
            }
          }
          state.formStates[formId] = { ...state.formStates[formId], ...newState }
        }, false, 'setFormState'),
        
        clearFormState: (formId) => set((state) => {
          delete state.formStates[formId]
        }, false, 'clearFormState'),
        
        // Auto-save management
        setAutoSaveEnabled: (enabled) => set((state) => {
          state.autoSave.enabled = enabled
        }, false, 'setAutoSaveEnabled'),
        
        setAutoSaveInterval: (interval) => set((state) => {
          state.autoSave.interval = interval
        }, false, 'setAutoSaveInterval'),
        
        updateLastAutoSave: () => set((state) => {
          state.autoSave.lastAutoSave = new Date()
        }, false, 'updateLastAutoSave'),
        
        // Utility methods
        getFormDraft: (formType) => {
          return get()[formType]
        },
        
        hasUnsavedChanges: (formId) => {
          const state = get()
          if (formId) {
            return state.formStates[formId]?.isDirty || false
          }
          // Check if any form has unsaved changes
          return Object.values(state.formStates).some(formState => formState.isDirty) ||
                 Object.values(state.propertyFormDraft).length > 0 ||
                 Object.values(state.leaseFormDraft).length > 0 ||
                 Object.values(state.unitFormDraft).length > 0 ||
                 Object.values(state.tenantFormDraft).length > 0
        },
      })),
      {
        name: 'tenantflow-form-store',
        version: 1,
        partialize: (state) => ({
          propertyFormDraft: state.propertyFormDraft,
          leaseFormDraft: state.leaseFormDraft,
          unitFormDraft: state.unitFormDraft,
          tenantFormDraft: state.tenantFormDraft,
          autoSave: state.autoSave,
        }),
      }
    ),
    {
      name: 'tenantflow-form-store',
    }
  )
)

// Selectors for optimized subscriptions
export const selectPropertyDraft = (state: FormDraftState & FormDraftActions) => state.propertyFormDraft
export const selectLeaseDraft = (state: FormDraftState & FormDraftActions) => state.leaseFormDraft
export const selectUnitDraft = (state: FormDraftState & FormDraftActions) => state.unitFormDraft
export const selectTenantDraft = (state: FormDraftState & FormDraftActions) => state.tenantFormDraft

export const selectFormState = (formId: string) => 
  (state: FormDraftState & FormDraftActions) => state.formStates[formId]

export const selectAutoSaveConfig = (state: FormDraftState & FormDraftActions) => state.autoSave

// Computed selectors
export const selectHasUnsavedChanges = (state: FormDraftState & FormDraftActions) => {
  return Object.values(state.formStates).some(formState => formState.isDirty) ||
         Object.values(state.propertyFormDraft).length > 0 ||
         Object.values(state.leaseFormDraft).length > 0 ||
         Object.values(state.unitFormDraft).length > 0 ||
         Object.values(state.tenantFormDraft).length > 0
}

// Specialized hooks for form management
export const usePropertyFormDraft = () => useFormStore((state) => ({
  draft: state.propertyFormDraft,
  saveDraft: state.savePropertyDraft,
  clearDraft: state.clearPropertyDraft,
  hasUnsavedChanges: Object.keys(state.propertyFormDraft).length > 0,
}))

export const useLeaseFormDraft = () => useFormStore((state) => ({
  draft: state.leaseFormDraft,
  saveDraft: state.saveLeaseDraft,
  clearDraft: state.clearLeaseDraft,
  hasUnsavedChanges: Object.keys(state.leaseFormDraft).length > 0,
}))

export const useFormStateManager = (formId: string) => useFormStore((state) => ({
  formState: state.formStates[formId] || {
    isDirty: false,
    hasErrors: false,
    isSubmitting: false,
    lastSaved: null,
  },
  setFormState: (newState: Partial<FormDraftState['formStates'][string]>) => 
    state.setFormState(formId, newState),
  clearFormState: () => state.clearFormState(formId),
}))

export const useAutoSave = () => useFormStore((state) => ({
  config: state.autoSave,
  setEnabled: state.setAutoSaveEnabled,
  setInterval: state.setAutoSaveInterval,
  updateLastSave: state.updateLastAutoSave,
}))