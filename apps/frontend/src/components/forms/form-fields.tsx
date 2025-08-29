'use client'

/**
 * Reusable form field components
 * Common form patterns following DRY principles
 */

import React from 'react'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { ReactNode } from 'react'

export interface FormFieldProps {
	label: string
	name: string
	error?: string
	required?: boolean
	className?: string
}

// Shared field container component - DRY principle
function FieldContainer({
	label,
	name,
	error,
	required,
	className,
	children
}: FormFieldProps & { children: ReactNode }) {
	return (
		<div className={`space-y-2 ${className || ''}`}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-5">*</span>}
			</Label>
			{children}
			{error && <p className="text-sm text-red-6">{error}</p>}
		</div>
	)
}

export interface BaseInputFieldProps extends FormFieldProps {
	placeholder?: string
	defaultValue?: string | number
	maxLength?: number
}

// Deleted unused type interfaces - use BaseInputFieldProps directly with Input/Textarea

export interface SelectFieldProps extends FormFieldProps {
	placeholder?: string
	defaultValue?: string
	options: Array<{ value: string; label: string }>
}

export interface CheckboxFieldProps extends FormFieldProps {
	defaultChecked?: boolean
	description?: string
}

// Deleted unused BaseField wrapper - use FieldContainer directly with UI components

export function SelectField({
	label,
	name,
	placeholder,
	defaultValue,
	error,
	required,
	options,
	className
}: SelectFieldProps) {
	return (
		<FieldContainer
			label={label}
			name={name}
			error={error}
			required={required}
			className={className}
		>
			<Select name={name} defaultValue={defaultValue} required={required}>
				<SelectTrigger className={error ? 'input-error-red' : ''}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldContainer>
	)
}

export function CheckboxField({
	label,
	name,
	defaultChecked,
	error,
	required,
	description,
	className
}: CheckboxFieldProps) {
	return (
		<div className={`space-y-2 ${className || ''}`}>
			<div className="flex items-center space-x-2">
				<Checkbox
					id={name}
					name={name}
					defaultChecked={defaultChecked}
					required={required}
				/>
				<Label
					htmlFor={name}
					className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:op-70"
				>
					{label}
					{required && <span className="ml-1 text-red-5">*</span>}
				</Label>
			</div>
			{description && (
				<p className="text-sm text-gray-6">{description}</p>
			)}
			{error && <p className="text-sm text-red-6">{error}</p>}
		</div>
	)
}

// Export remaining field components - use BaseField with Input/Textarea for basic fields
export {
	SelectField as FormSelectField,
	CheckboxField as FormCheckboxField
}
