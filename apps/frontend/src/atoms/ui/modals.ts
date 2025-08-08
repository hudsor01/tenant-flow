import { atom } from 'jotai'

export interface ModalState {
  propertyForm: boolean
  unitForm: boolean
  leaseForm: boolean
  maintenanceForm: boolean
  editProperty: boolean
  editUnit: boolean
  editLease: boolean
  editMaintenance: boolean
  inviteTenant: boolean
  subscriptionCheckout: boolean
  subscriptionSuccess: boolean
}

const initialModalState: ModalState = {
  propertyForm: false,
  unitForm: false,
  leaseForm: false,
  maintenanceForm: false,
  editProperty: false,
  editUnit: false,
  editLease: false,
  editMaintenance: false,
  inviteTenant: false,
  subscriptionCheckout: false,
  subscriptionSuccess: false,
}

// Modal state atom
export const modalsAtom = atom<ModalState>(initialModalState)

// Actions
export const openModalAtom = atom(
  null,
  (get, set, modal: keyof ModalState) => {
    const currentModals = get(modalsAtom)
    set(modalsAtom, {
      ...currentModals,
      [modal]: true
    })
  }
)

export const closeModalAtom = atom(
  null,
  (get, set, modal: keyof ModalState) => {
    const currentModals = get(modalsAtom)
    set(modalsAtom, {
      ...currentModals,
      [modal]: false
    })
  }
)

export const closeAllModalsAtom = atom(
  null,
  (get, set) => {
    set(modalsAtom, initialModalState)
  }
)

// Selectors for individual modals
export const isModalOpenAtom = (modalName: keyof ModalState) =>
  atom((get) => get(modalsAtom)[modalName])