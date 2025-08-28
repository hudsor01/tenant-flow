/**
 * React 19 useActionState Form Components
 * Pure React 19 form components replacing React Hook Form
 * Zero dependencies, native performance, server-first validation
 */

'use client'

import React from 'react'
import { Input } from './input'
import { Label } from './label'
import { Textarea } from './textarea'
import { Button } from './button'
import { cn } from '@/lib/utils'
import type { FormFieldProps, FormErrorProps, FormSubmitProps } from '@/hooks/use-action-state-form'

/**
 * Form Field Wrapper - React 19 useActionState compatible
 * Provides consistent field layout with automatic error handling
 */
export function FormField({ 
	name, 
	label, 
	error, 
	required, 
	disabled, 
	children, 
	className 
}: FormFieldProps) {
	const fieldId = `field-${name}`
	const errorId = `${fieldId}-error`
	
	return (
		<div className={cn('space-y-2', className)}>
			{label && (
				<Label htmlFor={fieldId} className={required ? "required-asterisk" : ""}>
					{label}
				</Label>
			)}
			
			{/* Clone children to add field props */}
            {React.Children.map(children, child => {
                if (!React.isValidElement(child)) {
                    return child
                }
                
                const childProps: Record<string, unknown> = {
                    id: fieldId,
                    name,
                    disabled,
                    'aria-invalid': Boolean(error),
                    'aria-describedby': error ? errorId : undefined
                }
                
                return React.cloneElement(child, childProps)
            })}
			
			{error && <FormError error={error} id={errorId} />}
		</div>
	)
}

/**
 * Form Error Display - React 19 useActionState compatible
 */
export function FormError({ error, errors, className, ...props }: FormErrorProps & React.HTMLAttributes<HTMLDivElement>) {
	const errorList = errors || (error ? [error] : [])
	
	if (errorList.length === 0) return null
	
	return (
		<div 
			className={cn('flex items-center gap-2 text-sm text-red-600', className)} 
			role="alert"
			{...props}
		>
			<i className="i-lucide-alert-circle inline-block h-4 w-4 flex-shrink-0"  />
			<div>
				{errorList.length === 1 ? (
					<span>{errorList[0]}</span>
				) : (
					<ul className="list-disc pl-4 space-y-1">
						{errorList.map((err, index) => (
							<li key={index}>{err}</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}

/**
 * Form Submit Button - React 19 useActionState compatible
 * Automatically shows pending state and disables during submission
 */
export function FormSubmit({ 
	isPending, 
	children, 
	pendingText = 'Submitting...', 
	disabled,
	className,
	...props 
}: FormSubmitProps & Omit<React.ComponentProps<typeof Button>, 'disabled' | 'children'>) {
	return (
		<Button
			type="submit"
			disabled={disabled || isPending}
			className={cn('min-w-[120px]', className)}
			{...props}
		>
			{isPending ? (
				<div className="flex items-center gap-2">
					<i className="i-lucide-loader-2 inline-block h-4 w-4 animate-spin"  />
					{pendingText}
				</div>
			) : children}
		</Button>
	)
}

/**
 * Form Input Field - React 19 useActionState compatible
 */
interface FormInputProps extends React.ComponentProps<typeof Input> {
	label?: string
	error?: string
	required?: boolean
}

export function FormInput({ label, error, required, name, className, ...props }: FormInputProps) {
	return (
		<FormField name={name!} label={label} error={error} required={required}>
			<Input 
				className={cn(error && 'border-red-500 focus:border-red-500', className)}
				{...props} 
			/>
		</FormField>
	)
}

/**
 * Form Textarea Field - React 19 useActionState compatible
 */
interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
	label?: string
	error?: string
	required?: boolean
}

export function FormTextarea({ label, error, required, name, className, ...props }: FormTextareaProps) {
	return (
		<FormField name={name!} label={label} error={error} required={required}>
			<Textarea 
				className={cn(error && 'border-red-500 focus:border-red-500', className)}
				{...props} 
			/>
		</FormField>
	)
}

/**
 * Form Success Message - React 19 useActionState compatible
 */
interface FormSuccessProps {
	message?: string
	className?: string
}

export function FormSuccess({ message, className }: FormSuccessProps) {
	if (!message) return null
	
	return (
		<div className={cn('rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800', className)}>
			{message}
		</div>
	)
}

/**
 * Form Container - React 19 useActionState compatible
 * Provides consistent form layout and error handling
 */
interface FormContainerProps {
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
	children: React.ReactNode
	className?: string
}

export function FormContainer({ onSubmit, children, className }: FormContainerProps) {
	return (
		<form onSubmit={onSubmit} className={cn('space-y-6', className)} noValidate>
			{children}
		</form>
	)
}

/**
 * React 19 Form Pattern Example:
 * 
 * ```tsx
 * import { useActionStateForm } from '@/hooks/use-action-state-form'
 * import { createTenantAction } from '@/lib/actions/tenant-actions'
 * import { FormContainer, FormInput, FormSubmit, FormError } from '@/components/ui/form-action-state'
 * 
 * export function TenantFormReact19() {
 *   const form = useActionStateForm({
 *     action: createTenantAction,
 *     onSuccess: (tenant) => {
 *       toast.success('Tenant created successfully!')
 *       router.push(`/tenants/${tenant.id}`)
 *     }
 *   })
 * 
 *   return (
 *     <FormContainer onSubmit={form.handleSubmit}>
 *       <FormInput
 *         name="name"
 *         label="Full Name"
 *         required
 *         error={form.getFieldError('name')}
 *       />
 *       
 *       <FormInput
 *         name="email"
 *         type="email"
 *         label="Email Address"
 *         required
 *         error={form.getFieldError('email')}
 *       />
 *       
 *       {form.state.error && <FormError error={form.state.error} />}
 *       
 *       <FormSubmit isPending={form.isPending}>
 *         Create Tenant
 *       </FormSubmit>
 *     </FormContainer>
 *   )
 * }
 * ```
 */
