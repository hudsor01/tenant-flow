/**
 * Form component prop types and interfaces
 * Centralizes all form-related component interfaces
 */

import type { ReactNode } from 'react'
import type {
	BaseComponentProps,
	FormMode,
	FieldSize,
	ValidationState,
	ClickHandler,
	ChangeHandler,
	AsyncSubmitHandler
} from '../core/common'
import type {
	PropertyFormData,
	TenantFormData,
	UnitFormData,
	LeaseFormData
} from '@repo/shared/validation'
import type { Property, Tenant, Unit, Lease } from '@repo/shared'
import type { AuthFormState } from '@/lib/actions/auth-actions'

// ============================================
// Form Container Props
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
// Entity Form Props
// ============================================

/**
 * Property form component props
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
 * Tenant form component props
 */
export interface TenantFormProps
	extends FormWithSuccessProps<Tenant>,
		FormWithErrorProps {
	tenant?: Tenant
	initialData?: Partial<TenantFormData>
	title?: string
	description?: string
}

/**
 * Unit form component props
 */
export interface UnitFormProps
	extends FormWithSuccessProps<Unit>,
		FormWithErrorProps {
	unit?: Unit
	propertyId?: string
	initialData?: Partial<UnitFormData>
	title?: string
	description?: string
}

/**
 * Lease form component props
 */
export interface LeaseFormProps
	extends FormWithSuccessProps<Lease>,
		FormWithErrorProps {
	lease?: Lease
	tenantId?: string
	unitId?: string
	propertyId?: string
	initialData?: Partial<LeaseFormData>
	title?: string
	description?: string
}

// ============================================
// Auth Form Props
// ============================================

/**
 * Login form props
 */
export interface LoginFormProps
	extends FormWithSuccessProps<unknown>,
		FormWithErrorProps {
	redirectTo?: string
	showRememberMe?: boolean
	showForgotPassword?: boolean
	showSignUpLink?: boolean
}

/**
 * Login form layout options
 */
export type LoginLayout = 'clean' | 'marketing'

/**
 * Extended login form props with layout and success handling
 */
export interface LoginFormRefactoredProps extends Omit<LoginFormProps, 'onSuccess'> {
	onSuccess?: (result: AuthFormState) => void
	layout?: LoginLayout
}

/**
 * Signup form props
 */
export interface SignupFormProps
	extends FormWithSuccessProps<unknown>,
		FormWithErrorProps {
	redirectTo?: string
	showLoginLink?: boolean
	requireTermsAcceptance?: boolean
}

/**
 * Forgot password form props
 */
export interface ForgotPasswordFormProps
	extends FormWithSuccessProps<unknown>,
		FormWithErrorProps {
	showBackToLogin?: boolean
}

/**
 * Reset password form props
 */
export interface ResetPasswordFormProps
	extends FormWithSuccessProps<unknown>,
		FormWithErrorProps {
	token?: string
}

/**
 * Update password form props
 */
export interface UpdatePasswordFormProps
	extends FormWithSuccessProps<unknown>,
		FormWithErrorProps {
	showCurrentPassword?: boolean
}

// ============================================
// Form Field Props
// ============================================

/**
 * Base field props
 */
export interface BaseFieldProps extends BaseComponentProps {
	name: string
	label?: string
	placeholder?: string
	size?: FieldSize
	disabled?: boolean
	required?: boolean
	readonly?: boolean
	error?: string
	hint?: string
}

/**
 * Text input field props
 */
export interface TextFieldProps extends BaseFieldProps {
	type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search'
	value?: string
	defaultValue?: string
	maxLength?: number
	minLength?: number
	pattern?: string
	autoComplete?: string
	onChange?: ChangeHandler<string>
}

/**
 * Number input field props
 */
export interface NumberFieldProps extends BaseFieldProps {
	value?: number | string
	defaultValue?: number | string
	min?: number
	max?: number
	step?: number
	onChange?: ChangeHandler<number | string>
}

/**
 * Textarea field props
 */
export interface TextareaFieldProps extends BaseFieldProps {
	value?: string
	defaultValue?: string
	rows?: number
	maxLength?: number
	resize?: 'none' | 'vertical' | 'horizontal' | 'both'
	onChange?: ChangeHandler<string>
}

/**
 * Select field props
 */
export interface SelectFieldProps<T = string> extends BaseFieldProps {
	value?: T
	defaultValue?: T
	options: FormSelectOption<T>[]
	placeholder?: string
	searchable?: boolean
	clearable?: boolean
	multiple?: boolean
	onChange?: ChangeHandler<T>
}

/**
 * Form select option interface
 */
export interface FormSelectOption<T = string> {
	label: string
	value: T
	disabled?: boolean
	description?: string
	icon?: ReactNode
}

/**
 * Checkbox field props
 */
export interface CheckboxFieldProps extends BaseFieldProps {
	checked?: boolean
	defaultChecked?: boolean
	value?: string
	onChange?: ChangeHandler<boolean>
}

/**
 * Radio group field props
 */
export interface RadioGroupFieldProps<T = string> extends BaseFieldProps {
	value?: T
	defaultValue?: T
	options: RadioOption<T>[]
	orientation?: 'horizontal' | 'vertical'
	onChange?: ChangeHandler<T>
}

/**
 * Radio option interface
 */
export interface RadioOption<T = string> {
	label: string
	value: T
	disabled?: boolean
	description?: string
}

/**
 * File input field props
 */
export interface FileFieldProps extends BaseFieldProps {
	accept?: string
	multiple?: boolean
	maxFiles?: number
	maxSize?: number
	onChange?: ChangeHandler<FileList | File[]>
}

/**
 * Date input field props
 */
export interface DateFieldProps extends BaseFieldProps {
	type?: 'date' | 'datetime-local' | 'time'
	value?: string | Date
	defaultValue?: string | Date
	min?: string | Date
	max?: string | Date
	onChange?: ChangeHandler<string | Date>
}

// ============================================
// Form Validation Props
// ============================================

/**
 * Field validation props
 */
export interface FieldValidationProps {
	validationState?: ValidationState
	validationMessage?: string
	showValidation?: boolean
}

/**
 * Form validation summary props
 */
export interface FormValidationSummaryProps extends BaseComponentProps {
	errors: Record<string, string>
	title?: string
	showFieldLinks?: boolean
}

// ============================================
// Form Layout Props
// ============================================

/**
 * Form section props
 */
export interface FormSectionProps extends BaseComponentProps {
	title?: string
	description?: string
	collapsible?: boolean
	defaultCollapsed?: boolean
}

/**
 * Form group props
 */
export interface FormGroupProps extends BaseComponentProps {
	label?: string
	description?: string
	required?: boolean
	error?: string
	horizontal?: boolean
}

/**
 * Form actions props
 */
export interface FormActionsProps extends BaseComponentProps {
	submitLabel?: string
	cancelLabel?: string
	showCancel?: boolean
	showReset?: boolean
	loading?: boolean
	disabled?: boolean
	alignment?: 'left' | 'center' | 'right'
	onSubmit?: ClickHandler
	onCancel?: ClickHandler
	onReset?: ClickHandler
}

// ============================================
// Form State Props
// ============================================

/**
 * Form loading state props
 */
export interface FormLoadingProps extends BaseComponentProps {
	loading: boolean
	loadingText?: string
	overlay?: boolean
}

/**
 * Form error state props
 */
export interface FormErrorProps extends BaseComponentProps {
	error: string | Error
	onRetry?: ClickHandler
	showRetry?: boolean
}

/**
 * Form success state props
 */
export interface FormSuccessProps extends BaseComponentProps {
	message: string
	onContinue?: ClickHandler
	showContinue?: boolean
}
