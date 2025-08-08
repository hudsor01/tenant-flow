import { useState } from 'react'

// Simple modal state management
export function useModal() {
  const [isOpen, setIsOpen] = useState(false)
  
  return {
    isOpen,
    setIsOpen,
    openModal: () => setIsOpen(true),
    closeModal: () => setIsOpen(false)
  }
}

// Minimal modal store for subscription modal compatibility
export function useModalStore() {
  return {
    subscriptionModal: useModal(),
    checkoutModal: useModal(),
    upgradeModal: useModal()
  }
}