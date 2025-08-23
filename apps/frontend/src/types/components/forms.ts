/**
 * Essential Form component prop types
 * Only contains types that are actually used in the codebase
 */

import type {
	BaseComponentProps,
	FormMode,
	ClickHandler,
	AsyncSubmitHandler
} from '../core/common'
import type {
	PropertyFormData,
	TenantFormData
} from '@repo/shared/validation'
import type { Property, Tenant } from '@repo/shared'

// ============================================
// Base Form Props
// ============================================

/**
 * Base form props that all forms should extend
 */
export interface BaseFormProps extends BaseComponentProps {
	mode?: FormMode
	loading?: boolean
	disabled?: boolean
	onSubmit?: AsyncSubmitHandler
	onCancel?: ClickHandler
	onClose?: ClickHandler
}

/**
 * Form props with success callback
 */
export interface FormWithSuccessProps<T> extends BaseFormProps {
	onSuccess?: (result: T) => void
}

/**
 * Form props with error handling
 */
export interface FormWithErrorProps extends BaseFormProps {
	error?: string
	errors?: Record<string, string>
}

// ============================================
// Actually Used Entity Form Props
// ============================================

/**
 * Property form component props - USED
 */
export interface PropertyFormProps
	extends FormWithSuccessProps<Property>,
		FormWithErrorProps {
	property?: Property
	initialData?: Partial<PropertyFormData>
	title?: string
	description?: string
}

/**
 * Tenant form component props - USED
 */
export interface TenantFormProps
	extends FormWithSuccessProps<Tenant>,
		FormWithErrorProps {
	tenant?: Tenant
	initialData?: Partial<TenantFormData>
	title?: string
	description?: string
}