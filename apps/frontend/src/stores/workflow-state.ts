/**
 * Workflow State Management with Zustand
 * For complex multi-step processes, form wizards, and business workflows
 */
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =====================================================
// 1. WORKFLOW TYPES
// =====================================================

export type WorkflowType = 
  | 'property-creation'
  | 'lease-generation' 
  | 'tenant-onboarding'
  | 'maintenance-request'
  | 'subscription-upgrade'

export type WorkflowStatus = 'idle' | 'in-progress' | 'completed' | 'cancelled' | 'error'

export interface WorkflowStep {
  id: string
  label: string
  description?: string
  completed: boolean
  current: boolean
  optional?: boolean
  data?: Record<string, unknown>
  validation?: {
    isValid: boolean
    errors?: string[]
  }
}

export interface WorkflowDefinition {
  id: string
  type: WorkflowType
  title: string
  description?: string
  steps: WorkflowStep[]
  currentStepIndex: number
  status: WorkflowStatus
  progress: number
  startedAt?: number
  completedAt?: number
  context: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// =====================================================
// 2. WORKFLOW STATE INTERFACE
// =====================================================

interface WorkflowState {
  // Active workflows
  workflows: Record<string, WorkflowDefinition>
  activeWorkflowId: string | null
  
  // Navigation state
  canGoBack: boolean
  canGoNext: boolean
  canComplete: boolean
  
  // UI state
  showWorkflowSidebar: boolean
  compactView: boolean
}

interface WorkflowActions {
  // Workflow lifecycle
  startWorkflow: (type: WorkflowType, config?: Partial<WorkflowDefinition>) => string
  cancelWorkflow: (workflowId: string) => void
  completeWorkflow: (workflowId: string) => void
  pauseWorkflow: (workflowId: string) => void
  resumeWorkflow: (workflowId: string) => void
  
  // Step navigation
  goToStep: (workflowId: string, stepIndex: number) => void
  nextStep: (workflowId: string) => void
  previousStep: (workflowId: string) => void
  completeStep: (workflowId: string, stepId: string, data?: Record<string, unknown>) => void
  
  // Step validation
  validateStep: (workflowId: string, stepId: string, validation: { isValid: boolean; errors?: string[] }) => void
  
  // Data management
  updateStepData: (workflowId: string, stepId: string, data: Record<string, unknown>) => void
  updateWorkflowContext: (workflowId: string, context: Record<string, unknown>) => void
  
  // UI actions
  setActiveWorkflow: (workflowId: string | null) => void
  toggleWorkflowSidebar: () => void
  setCompactView: (compact: boolean) => void
  
  // Cleanup
  clearCompletedWorkflows: () => void
  removeWorkflow: (workflowId: string) => void
  reset: () => void
}

// =====================================================
// 3. WORKFLOW TEMPLATES
// =====================================================

const workflowTemplates: Record<WorkflowType, Omit<WorkflowDefinition, 'id' | 'startedAt' | 'context'>> = {
  'property-creation': {
    type: 'property-creation',
    title: 'Create New Property',
    description: 'Add a new property to your portfolio',
    steps: [
      { id: 'basic-info', label: 'Basic Information', completed: false, current: true },
      { id: 'location', label: 'Location & Address', completed: false, current: false },
      { id: 'features', label: 'Features & Amenities', completed: false, current: false, optional: true },
      { id: 'media', label: 'Photos & Documents', completed: false, current: false, optional: true },
      { id: 'review', label: 'Review & Submit', completed: false, current: false },
    ],
    currentStepIndex: 0,
    status: 'idle',
    progress: 0,
  },
  
  'lease-generation': {
    type: 'lease-generation',
    title: 'Generate Lease Agreement',
    description: 'Create a comprehensive lease agreement',
    steps: [
      { id: 'property-selection', label: 'Select Property', completed: false, current: true },
      { id: 'tenant-info', label: 'Tenant Information', completed: false, current: false },
      { id: 'lease-terms', label: 'Lease Terms', completed: false, current: false },
      { id: 'additional-terms', label: 'Additional Terms', completed: false, current: false, optional: true },
      { id: 'review-generate', label: 'Review & Generate', completed: false, current: false },
    ],
    currentStepIndex: 0,
    status: 'idle',
    progress: 0,
  },
  
  'tenant-onboarding': {
    type: 'tenant-onboarding',
    title: 'Tenant Onboarding',
    description: 'Welcome new tenant and collect required information',
    steps: [
      { id: 'welcome', label: 'Welcome', completed: false, current: true },
      { id: 'personal-info', label: 'Personal Information', completed: false, current: false },
      { id: 'emergency-contacts', label: 'Emergency Contacts', completed: false, current: false },
      { id: 'documents', label: 'Required Documents', completed: false, current: false },
      { id: 'lease-signing', label: 'Lease Signing', completed: false, current: false },
      { id: 'move-in', label: 'Move-in Checklist', completed: false, current: false },
    ],
    currentStepIndex: 0,
    status: 'idle',
    progress: 0,
  },
  
  'maintenance-request': {
    type: 'maintenance-request',
    title: 'Maintenance Request',
    description: 'Submit and track maintenance request',
    steps: [
      { id: 'issue-details', label: 'Issue Details', completed: false, current: true },
      { id: 'photos-evidence', label: 'Photos & Evidence', completed: false, current: false, optional: true },
      { id: 'urgency-schedule', label: 'Urgency & Scheduling', completed: false, current: false },
      { id: 'review-submit', label: 'Review & Submit', completed: false, current: false },
    ],
    currentStepIndex: 0,
    status: 'idle',
    progress: 0,
  },
  
  'subscription-upgrade': {
    type: 'subscription-upgrade',
    title: 'Subscription Upgrade',
    description: 'Upgrade your subscription plan',
    steps: [
      { id: 'plan-selection', label: 'Select Plan', completed: false, current: true },
      { id: 'features-comparison', label: 'Features Comparison', completed: false, current: false, optional: true },
      { id: 'billing-details', label: 'Billing Details', completed: false, current: false },
      { id: 'payment-method', label: 'Payment Method', completed: false, current: false },
      { id: 'confirmation', label: 'Confirmation', completed: false, current: false },
    ],
    currentStepIndex: 0,
    status: 'idle',
    progress: 0,
  },
}

// =====================================================
// 4. STORE IMPLEMENTATION
// =====================================================

const initialState: WorkflowState = {
  workflows: {},
  activeWorkflowId: null,
  canGoBack: false,
  canGoNext: false,
  canComplete: false,
  showWorkflowSidebar: false,
  compactView: false,
}

const generateWorkflowId = () => `workflow-${Date.now()}-${Math.random().toString(36).substring(2)}`

export const useWorkflowStore = create<WorkflowState & WorkflowActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        // Workflow lifecycle
        startWorkflow: (type, config = {}) => {
          const id = generateWorkflowId()
          const template = workflowTemplates[type]
          
          set((state) => {
            state.workflows[id] = {
              ...template,
              ...config,
              id,
              context: config.context || {},
              startedAt: Date.now(),
              status: 'in-progress',
            }
            state.activeWorkflowId = id
            
            // Update navigation state
            const workflow = state.workflows[id]
            state.canGoBack = workflow.currentStepIndex > 0
            state.canGoNext = workflow.currentStepIndex < workflow.steps.length - 1
            state.canComplete = workflow.currentStepIndex === workflow.steps.length - 1
          }, false, 'startWorkflow')
          
          return id
        },
        
        cancelWorkflow: (workflowId) => set((state) => {
          if (state.workflows[workflowId]) {
            state.workflows[workflowId].status = 'cancelled'
            if (state.activeWorkflowId === workflowId) {
              state.activeWorkflowId = null
            }
          }
        }, false, 'cancelWorkflow'),
        
        completeWorkflow: (workflowId) => set((state) => {
          if (state.workflows[workflowId]) {
            state.workflows[workflowId].status = 'completed'
            state.workflows[workflowId].completedAt = Date.now()
            state.workflows[workflowId].progress = 100
            
            // Mark all steps as completed
            state.workflows[workflowId].steps.forEach(step => {
              step.completed = true
              step.current = false
            })
            
            if (state.activeWorkflowId === workflowId) {
              state.activeWorkflowId = null
            }
          }
        }, false, 'completeWorkflow'),
        
        pauseWorkflow: (workflowId) => set((state) => {
          if (state.workflows[workflowId]) {
            state.workflows[workflowId].status = 'idle'
          }
        }, false, 'pauseWorkflow'),
        
        resumeWorkflow: (workflowId) => set((state) => {
          if (state.workflows[workflowId]) {
            state.workflows[workflowId].status = 'in-progress'
            state.activeWorkflowId = workflowId
          }
        }, false, 'resumeWorkflow'),
        
        // Step navigation
        goToStep: (workflowId, stepIndex) => set((state) => {
          const workflow = state.workflows[workflowId]
          if (!workflow || stepIndex < 0 || stepIndex >= workflow.steps.length) return
          
          // Update current step
          workflow.steps.forEach((step, index) => {
            step.current = index === stepIndex
          })
          
          workflow.currentStepIndex = stepIndex
          workflow.progress = Math.round((stepIndex / (workflow.steps.length - 1)) * 100)
          
          // Update navigation state
          state.canGoBack = stepIndex > 0
          state.canGoNext = stepIndex < workflow.steps.length - 1
          state.canComplete = stepIndex === workflow.steps.length - 1
        }, false, 'goToStep'),
        
        nextStep: (workflowId) => {
          const { workflows } = get()
          const workflow = workflows[workflowId]
          if (workflow && workflow.currentStepIndex < workflow.steps.length - 1) {
            get().goToStep(workflowId, workflow.currentStepIndex + 1)
          }
        },
        
        previousStep: (workflowId) => {
          const { workflows } = get()
          const workflow = workflows[workflowId]
          if (workflow && workflow.currentStepIndex > 0) {
            get().goToStep(workflowId, workflow.currentStepIndex - 1)
          }
        },
        
        completeStep: (workflowId, stepId, data) => set((state) => {
          const workflow = state.workflows[workflowId]
          if (!workflow) return
          
          const step = workflow.steps.find(s => s.id === stepId)
          if (step) {
            step.completed = true
            if (data) {
              step.data = { ...step.data, ...data }
            }
          }
        }, false, 'completeStep'),
        
        // Step validation
        validateStep: (workflowId, stepId, validation) => set((state) => {
          const workflow = state.workflows[workflowId]
          if (!workflow) return
          
          const step = workflow.steps.find(s => s.id === stepId)
          if (step) {
            step.validation = validation
          }
        }, false, 'validateStep'),
        
        // Data management
        updateStepData: (workflowId, stepId, data) => set((state) => {
          const workflow = state.workflows[workflowId]
          if (!workflow) return
          
          const step = workflow.steps.find(s => s.id === stepId)
          if (step) {
            step.data = { ...step.data, ...data }
          }
        }, false, 'updateStepData'),
        
        updateWorkflowContext: (workflowId, context) => set((state) => {
          const workflow = state.workflows[workflowId]
          if (workflow) {
            workflow.context = { ...workflow.context, ...context }
          }
        }, false, 'updateWorkflowContext'),
        
        // UI actions
        setActiveWorkflow: (workflowId) => set((state) => {
          state.activeWorkflowId = workflowId
          
          if (workflowId && state.workflows[workflowId]) {
            const workflow = state.workflows[workflowId]
            state.canGoBack = workflow.currentStepIndex > 0
            state.canGoNext = workflow.currentStepIndex < workflow.steps.length - 1
            state.canComplete = workflow.currentStepIndex === workflow.steps.length - 1
          } else {
            state.canGoBack = false
            state.canGoNext = false
            state.canComplete = false
          }
        }, false, 'setActiveWorkflow'),
        
        toggleWorkflowSidebar: () => set((state) => {
          state.showWorkflowSidebar = !state.showWorkflowSidebar
        }, false, 'toggleWorkflowSidebar'),
        
        setCompactView: (compact) => set((state) => {
          state.compactView = compact
        }, false, 'setCompactView'),
        
        // Cleanup
        clearCompletedWorkflows: () => set((state) => {
          Object.keys(state.workflows).forEach(id => {
            const workflow = state.workflows[id]
            if (workflow?.status === 'completed') {
              delete state.workflows[id]
            }
          })
          
          // If active workflow was cleared, reset active
          if (state.activeWorkflowId && !state.workflows[state.activeWorkflowId]) {
            state.activeWorkflowId = null
          }
        }, false, 'clearCompletedWorkflows'),
        
        removeWorkflow: (workflowId) => set((state) => {
          delete state.workflows[workflowId]
          if (state.activeWorkflowId === workflowId) {
            state.activeWorkflowId = null
          }
        }, false, 'removeWorkflow'),
        
        reset: () => set(initialState, false, 'reset'),
      }))
    ),
    {
      name: 'TenantFlow Workflow Store',
    }
  )
)

// =====================================================
// 5. SELECTORS & HOOKS
// =====================================================

// Selectors
export const selectActiveWorkflow = (state: WorkflowState & WorkflowActions) => 
  state.activeWorkflowId ? state.workflows[state.activeWorkflowId] : null

export const selectWorkflowsByType = (type: WorkflowType) => (state: WorkflowState & WorkflowActions) =>
  Object.values(state.workflows).filter(w => w.type === type)

export const selectInProgressWorkflows = (state: WorkflowState & WorkflowActions) =>
  Object.values(state.workflows).filter(w => w.status === 'in-progress')

// Hooks
export const useActiveWorkflow = () => useWorkflowStore(selectActiveWorkflow)

export const useWorkflowNavigation = () => useWorkflowStore((state) => ({
  canGoBack: state.canGoBack,
  canGoNext: state.canGoNext,
  canComplete: state.canComplete,
  nextStep: state.nextStep,
  previousStep: state.previousStep,
  goToStep: state.goToStep,
}))

export const useWorkflowActions = () => useWorkflowStore((state) => ({
  start: state.startWorkflow,
  cancel: state.cancelWorkflow,
  complete: state.completeWorkflow,
  pause: state.pauseWorkflow,
  resume: state.resumeWorkflow,
  updateContext: state.updateWorkflowContext,
  updateStepData: state.updateStepData,
  completeStep: state.completeStep,
  validateStep: state.validateStep,
}))

export const useWorkflowByType = (type: WorkflowType) => 
  useWorkflowStore(selectWorkflowsByType(type))