import type { Property, Unit } from '@repo/shared'
import type { BaseModalProps } from './components/modals'

export interface UnitFormModalProps extends BaseModalProps {
	propertyId: string
	unit?: Unit
	mode?: 'create' | 'edit'
}

export interface PropertyFormModalProps extends BaseModalProps {
	property?: Property
	mode?: 'create' | 'edit'
}
