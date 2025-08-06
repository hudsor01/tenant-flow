import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Define all possible modal types in the application
export type ModalType = 
  | 'property-form'
  | 'property-edit'
  | 'property-delete'
  | 'unit-form'
  | 'unit-edit'
  | 'unit-delete'
  | 'tenant-form'
  | 'tenant-edit'
  | 'tenant-delete'
  | 'tenant-invite'
  | 'lease-form'
  | 'lease-edit'
  | 'lease-delete'
  | 'lease-renew'
  | 'maintenance-form'
  | 'maintenance-edit'
  | 'maintenance-delete'
  | 'maintenance-assign'
  | 'subscription-checkout'
  | 'subscription-success'
  | 'subscription-manage'
  | 'upgrade-prompt'
  | 'confirmation'
  | 'alert'
  | 'image-viewer'
  | 'document-viewer'
  | 'help'
  | 'feedback'

export interface Modal {
  type: ModalType
  data?: Record<string, unknown>
  onClose?: () => void
  onConfirm?: (data?: Record<string, unknown>) => void | Promise<void>
  preventClose?: boolean // Prevent closing by clicking outside or pressing ESC
  size?: 'small' | 'medium' | 'large' | 'full'
  title?: string
  description?: string
}

interface ModalState {
  // Currently active modals (stack for nested modals)
  modalStack: Modal[]
  
  // Modal history for analytics
  modalHistory: {
    type: ModalType
    openedAt: number
    closedAt?: number
    confirmed?: boolean
  }[]
  
  // UI state
  isTransitioning: boolean
  backdrop: 'transparent' | 'blur' | 'dark'
}

interface ModalActions {
  // Core modal actions
  openModal: (modal: Modal | ModalType, data?: Record<string, unknown>) => void
  closeModal: (type?: ModalType) => void
  closeAllModals: () => void
  closeTopModal: () => void
  
  // Stack management
  replaceModal: (modal: Modal | ModalType, data?: Record<string, unknown>) => void
  updateModalData: (data: Record<string, unknown>) => void
  
  // Confirmation helpers
  confirm: (type?: ModalType) => void
  cancel: (type?: ModalType) => void
  
  // UI state
  setTransitioning: (transitioning: boolean) => void
  setBackdrop: (backdrop: ModalState['backdrop']) => void
  
  // Utility
  isModalOpen: (type: ModalType) => boolean
  getActiveModal: () => Modal | null
  getModalData: (type?: ModalType) => Record<string, unknown> | undefined
  clearHistory: () => void
}

const initialState: ModalState = {
  modalStack: [],
  modalHistory: [],
  isTransitioning: false,
  backdrop: 'blur',
}

export const useModalStore = create<ModalState & ModalActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        // Core modal actions
        openModal: (modal, data) => {
          const modalObj: Modal = typeof modal === 'string' 
            ? { type: modal, data } 
            : modal
          
          set((state) => {
            // Add to stack
            state.modalStack.push(modalObj)
            
            // Add to history
            state.modalHistory.push({
              type: modalObj.type,
              openedAt: Date.now(),
            })
            
            // Limit history size
            if (state.modalHistory.length > 100) {
              state.modalHistory = state.modalHistory.slice(-100)
            }
          }, false, 'openModal')
          
          // Prevent body scroll when modal is open
          if (typeof document !== 'undefined' && get().modalStack.length === 1) {
            document.body.style.overflow = 'hidden'
          }
        },
        
        closeModal: (type) => {
          set((state) => {
            if (type) {
              // Close specific modal type
              const index = state.modalStack.findIndex(m => m.type === type)
              if (index !== -1) {
                const modal = state.modalStack[index]
                
                // Call onClose callback if exists
                if (modal?.onClose) {
                  modal.onClose()
                }
                
                // Remove from stack
                state.modalStack.splice(index, 1)
                
                // Update history
                const historyEntry = state.modalHistory
                  .reverse()
                  .find(h => h.type === type && !h.closedAt)
                if (historyEntry) {
                  historyEntry.closedAt = Date.now()
                }
              }
            } else {
              // Close top modal
              const modal = state.modalStack.pop()
              if (modal) {
                // Call onClose callback if exists
                if (modal.onClose) {
                  modal.onClose()
                }
                
                // Update history
                const historyEntry = state.modalHistory
                  .reverse()
                  .find(h => h.type === modal.type && !h.closedAt)
                if (historyEntry) {
                  historyEntry.closedAt = Date.now()
                }
              }
            }
          }, false, 'closeModal')
          
          // Restore body scroll when all modals are closed
          if (typeof document !== 'undefined' && get().modalStack.length === 0) {
            document.body.style.overflow = ''
          }
        },
        
        closeAllModals: () => {
          set((state) => {
            // Call onClose callbacks
            state.modalStack.forEach(modal => {
              if (modal.onClose) {
                modal.onClose()
              }
            })
            
            // Update history
            const now = Date.now()
            state.modalHistory.forEach(entry => {
              if (!entry.closedAt) {
                entry.closedAt = now
              }
            })
            
            // Clear stack
            state.modalStack = []
          }, false, 'closeAllModals')
          
          // Restore body scroll
          if (typeof document !== 'undefined') {
            document.body.style.overflow = ''
          }
        },
        
        closeTopModal: () => {
          get().closeModal()
        },
        
        // Stack management
        replaceModal: (modal, data) => {
          const modalObj: Modal = typeof modal === 'string' 
            ? { type: modal, data } 
            : modal
          
          set((state) => {
            // Close current top modal
            const current = state.modalStack.pop()
            if (current?.onClose) {
              current.onClose()
            }
            
            // Add new modal
            state.modalStack.push(modalObj)
            
            // Update history
            if (current) {
              const historyEntry = state.modalHistory
                .reverse()
                .find(h => h.type === current.type && !h.closedAt)
              if (historyEntry) {
                historyEntry.closedAt = Date.now()
              }
            }
            
            state.modalHistory.push({
              type: modalObj.type,
              openedAt: Date.now(),
            })
          }, false, 'replaceModal')
        },
        
        updateModalData: (data) => {
          set((state) => {
            const topModal = state.modalStack[state.modalStack.length - 1]
            if (topModal) {
              topModal.data = { ...topModal.data, ...data }
            }
          }, false, 'updateModalData')
        },
        
        // Confirmation helpers
        confirm: (type) => {
          const state = get()
          const modal = type 
            ? state.modalStack.find(m => m.type === type)
            : state.modalStack[state.modalStack.length - 1]
          
          if (modal) {
            // Update history
            const historyEntry = state.modalHistory
              .reverse()
              .find(h => h.type === modal.type && !h.closedAt)
            if (historyEntry) {
              historyEntry.confirmed = true
            }
            
            // Call onConfirm callback
            if (modal.onConfirm) {
              const result = modal.onConfirm(modal.data)
              
              // Handle async confirmation
              if (result instanceof Promise) {
                result.then(() => {
                  get().closeModal(modal.type)
                }).catch((error) => {
                  console.error('Modal confirmation error:', error)
                })
              } else {
                get().closeModal(modal.type)
              }
            } else {
              get().closeModal(modal.type)
            }
          }
        },
        
        cancel: (type) => {
          get().closeModal(type)
        },
        
        // UI state
        setTransitioning: (transitioning) => set((state) => {
          state.isTransitioning = transitioning
        }, false, 'setTransitioning'),
        
        setBackdrop: (backdrop) => set((state) => {
          state.backdrop = backdrop
        }, false, 'setBackdrop'),
        
        // Utility
        isModalOpen: (type) => {
          return get().modalStack.some(m => m.type === type)
        },
        
        getActiveModal: (): Modal | null => {
          const stack = get().modalStack
          return stack.length > 0 ? (stack[stack.length - 1] ?? null) : null
        },
        
        getModalData: (type) => {
          const state = get()
          const modal = type
            ? state.modalStack.find(m => m.type === type)
            : state.getActiveModal()
          return modal?.data
        },
        
        clearHistory: () => set((state) => {
          state.modalHistory = []
        }, false, 'clearHistory'),
      }))
    ),
    {
      name: 'TenantFlow Modal Store',
    }
  )
)

// Selectors
export const selectModalStack = (state: ModalState & ModalActions) => state.modalStack
export const selectActiveModal = (state: ModalState & ModalActions) => 
  state.modalStack.length > 0 ? state.modalStack[state.modalStack.length - 1] : null
export const selectModalHistory = (state: ModalState & ModalActions) => state.modalHistory
export const selectIsTransitioning = (state: ModalState & ModalActions) => state.isTransitioning
export const selectBackdrop = (state: ModalState & ModalActions) => state.backdrop

// Computed selectors
export const selectHasModals = (state: ModalState & ModalActions) => state.modalStack.length > 0
export const selectModalCount = (state: ModalState & ModalActions) => state.modalStack.length
export const selectIsModalOpen = (type: ModalType) => (state: ModalState & ModalActions) => 
  state.modalStack.some(m => m.type === type)

// Hooks
export const useModal = () => useModalStore((state) => ({
  activeModal: selectActiveModal(state),
  modalStack: state.modalStack,
  open: state.openModal,
  close: state.closeModal,
  closeAll: state.closeAllModals,
  replace: state.replaceModal,
  confirm: state.confirm,
  cancel: state.cancel,
  isOpen: state.isModalOpen,
  getData: state.getModalData,
}))

export const useActiveModal = () => useModalStore(selectActiveModal)
export const useModalStack = () => useModalStore(selectModalStack)
export const useHasModals = () => useModalStore(selectHasModals)

// Specific modal hooks
export const usePropertyModal = () => {
  const { open, close, isOpen } = useModal()
  return {
    openNew: (data?: Record<string, unknown>) => open('property-form', data),
    openEdit: (data: Record<string, unknown>) => open('property-edit', data),
    openDelete: (data: Record<string, unknown>) => open('property-delete', data),
    close: () => {
      close('property-form')
      close('property-edit')
      close('property-delete')
    },
    isOpen: isOpen('property-form') || isOpen('property-edit') || isOpen('property-delete'),
  }
}

export const useTenantModal = () => {
  const { open, close, isOpen } = useModal()
  return {
    openNew: (data?: Record<string, unknown>) => open('tenant-form', data),
    openEdit: (data: Record<string, unknown>) => open('tenant-edit', data),
    openInvite: (data: Record<string, unknown>) => open('tenant-invite', data),
    close: () => {
      close('tenant-form')
      close('tenant-edit')
      close('tenant-invite')
    },
    isOpen: isOpen('tenant-form') || isOpen('tenant-edit') || isOpen('tenant-invite'),
  }
}

export const useSubscriptionModal = () => {
  const { open, close, isOpen } = useModal()
  return {
    openCheckout: (data?: Record<string, unknown>) => open('subscription-checkout', data),
    openSuccess: (data?: Record<string, unknown>) => open('subscription-success', data),
    openManage: (data?: Record<string, unknown>) => open('subscription-manage', data),
    close: () => {
      close('subscription-checkout')
      close('subscription-success')
      close('subscription-manage')
    },
    isOpen: isOpen('subscription-checkout') || isOpen('subscription-success') || isOpen('subscription-manage'),
  }
}

// Confirmation modal helper
export const useConfirmation = () => {
  const { open } = useModal()
  
  return (options: {
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
    type?: 'danger' | 'warning' | 'info'
  }) => {
    open({
      type: 'confirmation',
      title: options.title,
      description: options.description,
      data: {
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        type: options.type || 'info',
      },
      onConfirm: options.onConfirm,
      onClose: options.onCancel,
    })
  }
}