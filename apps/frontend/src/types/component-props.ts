import type { Property, Unit } from '@repo/shared'

export interface UnitFormModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  unit?: Unit
  mode?: 'create' | 'edit'
  onSuccess?: () => void
}

export interface PropertyFormModalProps {
  isOpen: boolean
  onClose: () => void
  property?: Property
  mode?: 'create' | 'edit'
  onSuccess?: () => void
}

export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}