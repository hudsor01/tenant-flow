'use client'

/**
 * Reusable form field components
 * Common form patterns following DRY principles
 */

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export interface TextFieldProps extends BaseInputFieldProps {
	type?: 'text' | 'email' | 'tel' | 'url'
	defaultValue?: string
}

export interface NumberFieldProps extends BaseInputFieldProps {
	defaultValue?: number
	min?: number
	max?: number
	step?: number
}

export interface TextareaFieldProps extends BaseInputFieldProps {
	defaultValue?: string
	rows?: number
}

export interface SelectFieldProps extends FormFieldProps {
	placeholder?: string
	defaultValue?: string
	options: Array<{ value: string; label: string }>
}

export interface CheckboxFieldProps extends FormFieldProps {
	defaultChecked?: boolean
	description?: string
}

// Generic field wrapper - DRY principle for common field patterns
function BaseField<T extends Record<string, unknown>>({
	label,
	name,
	error,
	required,
	className,
	children
}: {
	label: string
	name: string
	error?: string
	required?: boolean
	className?: string
	children: React.ReactElement<T>
}) {
	return (
		<FieldContainer
			label={label}
			name={name}
			error={error}
			required={required}
			className={className}
		>
			{React.cloneElement(children, {
				id: name,
				name,
				required,
				className: error ? 'input-error-red' : '',
				...children.props
			})}
		</FieldContainer>
	)
}

export function TextField({
	label,
	name,
	type = 'text',
	placeholder,
	defaultValue,
	error,
	required,
	maxLength,
	className
}: TextFieldProps) {
	return (
		<BaseField
			label={label}
			name={name}
			error={error}
			required={required}
			className={className}
		>
			<Input
				type={type}
				placeholder={placeholder}
				defaultValue={defaultValue}
				maxLength={maxLength}
			/>
		</BaseField>
	)
}

export function NumberField({
	label,
	name,
	placeholder,
	defaultValue,
	error,
	required,
	min,
	max,
	step,
	className
}: NumberFieldProps) {
	return (
		<BaseField
			label={label}
			name={name}
			error={error}
			required={required}
			className={className}
		>
			<Input
				type="number"
				placeholder={placeholder}
				defaultValue={defaultValue}
				min={min}
				max={max}
				step={step}
			/>
		</BaseField>
	)
}

export function TextareaField({
	label,
	name,
	placeholder,
	defaultValue,
	error,
	required,
	rows = 3,
	maxLength,
	className
}: TextareaFieldProps) {
	return (
		<BaseField
			label={label}
			name={name}
			error={error}
			required={required}
			className={className}
		>
			<Textarea
				placeholder={placeholder}
				defaultValue={defaultValue}
				rows={rows}
				maxLength={maxLength}
			/>
		</BaseField>
	)
}

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

// Export all field components
export {
	TextField as FormTextField,
	NumberField as FormNumberField,
	TextareaField as FormTextareaField,
	SelectField as FormSelectField,
	CheckboxField as FormCheckboxField
}
