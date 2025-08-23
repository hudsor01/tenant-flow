'use client'

/**
 * Reusable form field components
 * Common form patterns following DRY principles
 */

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

export interface FormFieldProps {
	label: string
	name: string
	error?: string
	required?: boolean
	className?: string
}

export interface TextFieldProps extends FormFieldProps {
	type?: 'text' | 'email' | 'tel' | 'url'
	placeholder?: string
	defaultValue?: string
	maxLength?: number
}

export interface NumberFieldProps extends FormFieldProps {
	placeholder?: string
	defaultValue?: number
	min?: number
	max?: number
	step?: number
}

export interface TextareaFieldProps extends FormFieldProps {
	placeholder?: string
	defaultValue?: string
	rows?: number
	maxLength?: number
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
		<div className={`space-y-2 ${className || ''}`}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</Label>
			<Input
				id={name}
				name={name}
				type={type}
				placeholder={placeholder}
				defaultValue={defaultValue}
				required={required}
				maxLength={maxLength}
				className={error ? 'border-red-500' : ''}
			/>
			{error && <p className="text-sm text-red-600">{error}</p>}
		</div>
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
		<div className={`space-y-2 ${className || ''}`}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</Label>
			<Input
				id={name}
				name={name}
				type="number"
				placeholder={placeholder}
				defaultValue={defaultValue}
				required={required}
				min={min}
				max={max}
				step={step}
				className={error ? 'border-red-500' : ''}
			/>
			{error && <p className="text-sm text-red-600">{error}</p>}
		</div>
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
		<div className={`space-y-2 ${className || ''}`}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</Label>
			<Textarea
				id={name}
				name={name}
				placeholder={placeholder}
				defaultValue={defaultValue}
				required={required}
				rows={rows}
				maxLength={maxLength}
				className={error ? 'border-red-500' : ''}
			/>
			{error && <p className="text-sm text-red-600">{error}</p>}
		</div>
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
		<div className={`space-y-2 ${className || ''}`}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</Label>
			<Select name={name} defaultValue={defaultValue} required={required}>
				<SelectTrigger className={error ? 'border-red-500' : ''}>
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
			{error && <p className="text-sm text-red-600">{error}</p>}
		</div>
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
					className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{label}
					{required && <span className="ml-1 text-red-500">*</span>}
				</Label>
			</div>
			{description && (
				<p className="text-sm text-gray-600">{description}</p>
			)}
			{error && <p className="text-sm text-red-600">{error}</p>}
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
