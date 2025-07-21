// Property-related component prop interfaces
import type { Property } from './entities'

// PropertyCardProps moved to component-props.ts for centralization

export interface PropertyFormModalProps {
	isOpen: boolean
	onClose: () => void
	property?: Property
	onSuccess?: () => void
}

export interface PropertyErrorStateProps {
	error: string
	onRetry?: () => void
}

export interface PropertyHeaderSectionProps {
	property: Property
	onEdit?: () => void
	onDelete?: () => void
}

export interface PropertyStatsSectionProps {
	property: Property
}
