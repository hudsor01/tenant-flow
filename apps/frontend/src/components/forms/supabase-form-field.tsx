'use client'

/**
 * Supabase-specific form field component
 * Handles form fields with Supabase real-time validation
 */

import { useState, useEffect } from 'react'
import {
	useController,
	type Control,
	type FieldValues,
	type Path
} from 'react-hook-form'
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
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

import type { PathValue } from 'react-hook-form'

export interface SupabaseFormFieldProps<
	TFormData extends FieldValues = FieldValues
> {
	label: string
	name: Path<TFormData>
	control: Control<TFormData>
	type?: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select'
	placeholder?: string
	defaultValue?: PathValue<TFormData, Path<TFormData>>
	required?: boolean
	multiline?: boolean
	className?: string
	validation?: {
		table?: string
		column?: string
		unique?: boolean
	}
	options?: Array<{ value: string; label: string }>
	rows?: number
}

export interface Property_TypeFieldProps<
	TFormData extends FieldValues = FieldValues
> {
	label: string
	name: Path<TFormData>
	control: Control<TFormData>
	defaultValue?: PathValue<TFormData, Path<TFormData>>
	required?: boolean
	className?: string
}

export function SupabaseFormField<TFormData extends FieldValues = FieldValues>({
	label,
	name,
	control,
	type = 'text',
	placeholder,
	defaultValue,
	required,
	multiline = false,
	className,
	validation,
	options = [],
	rows = 3
}: SupabaseFormFieldProps<TFormData>) {
	const {
		field: { onChange, onBlur, value, ref },
		fieldState: { error }
	} = useController({
		name,
		control,
		defaultValue
	})

	const [validationError, setValidationError] = useState<string | null>(null)
	const [isValidating, setIsValidating] = useState(false)

	// Real-time validation for unique fields
	useEffect(() => {
		if (
			!validation?.unique ||
			!validation.table ||
			!validation.column ||
			!value
		) {
			setValidationError(null)
			return
		}

		const validateUnique = async () => {
			setIsValidating(true)
			try {
				const supabase = createClient()
				// Type assertion for dynamic table name - Supabase expects literal types
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const { data, error } = await (supabase as any)
					.from(validation.table!)
					.select('id')
					.eq(validation.column!, value)
					.limit(1)

				if (error) {
					console.warn('Validation error:', error)
					setValidationError(null)
				} else if (data && data.length > 0) {
					setValidationError(
						`This ${label.toLowerCase()} is already taken`
					)
				} else {
					setValidationError(null)
				}
			} catch (err) {
				console.warn('Validation failed:', err)
				setValidationError(null)
			} finally {
				setIsValidating(false)
			}
		}

		// Debounce validation
		const timeoutId = setTimeout(validateUnique, 500)
		return () => clearTimeout(timeoutId)
	}, [value, validation, label])

	const handleChange = (newValue: string) => {
		onChange(newValue)
	}

	const fieldError = error?.message || validationError
	const isError = !!fieldError

	const fieldClassName = cn(
		isError && 'border-red-5',
		isValidating && 'border-yellow-5',
		className
	)

	// Render different field types
	const renderField = () => {
		switch (type) {
			case 'textarea':
				return (
					<Textarea
						id={name}
						name={name}
						ref={ref}
						placeholder={placeholder}
						value={value}
						onChange={e => handleChange(e.target.value)}
						onBlur={onBlur}
						required={required}
						rows={rows}
						className={fieldClassName}
					/>
				)

			case 'select':
				return (
					<Select
						name={name}
						value={value}
						onValueChange={handleChange}
						required={required}
					>
						<SelectTrigger className={fieldClassName}>
							<SelectValue placeholder={placeholder} />
						</SelectTrigger>
						<SelectContent>
							{options.map(option => (
								<SelectItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)

			default:
				if (multiline) {
					return (
						<Textarea
							id={name}
							name={name}
							ref={ref}
							placeholder={placeholder}
							value={value}
							onChange={e => handleChange(e.target.value)}
							onBlur={onBlur}
							required={required}
							rows={rows}
							className={fieldClassName}
						/>
					)
				}
				return (
					<Input
						id={name}
						name={name}
						ref={ref}
						type={type}
						placeholder={placeholder}
						value={value}
						onChange={e => handleChange(e.target.value)}
						onBlur={onBlur}
						required={required}
						className={fieldClassName}
					/>
				)
		}
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-5">*</span>}
				{isValidating && (
					<span className="ml-1 text-yellow-5">(checking...)</span>
				)}
			</Label>
			{renderField()}
			{fieldError && <p className="text-sm text-red-6">{fieldError}</p>}
		</div>
	)
}

// Property_ Type Field Component
export function Property_TypeField<TFormData extends FieldValues = FieldValues>({
	label,
	name,
	control,
	defaultValue,
	required,
	className
}: Property_TypeFieldProps<TFormData>) {
	const {
		field: { onChange, value },
		fieldState: { error }
	} = useController({
		name,
		control,
		defaultValue
	})

	const propertyTypes = [
		{ value: 'SINGLE_FAMILY', label: 'Single Family' },
		{ value: 'MULTI_FAMILY', label: 'Multi Family' },
		{ value: 'APARTMENT', label: 'Apartment' },
		{ value: 'CONDO', label: 'Condo' },
		{ value: 'TOWNHOUSE', label: 'Townhouse' },
		{ value: 'COMMERCIAL', label: 'Commercial' }
	]

	return (
		<div className={cn('space-y-2', className)}>
			<Label htmlFor={name}>
				{label}
				{required && <span className="ml-1 text-red-5">*</span>}
			</Label>
			<Select
				name={name}
				value={value}
				onValueChange={onChange}
				required={required}
			>
				<SelectTrigger className={cn(error && 'border-red-5')}>
					<SelectValue placeholder="Select property type" />
				</SelectTrigger>
				<SelectContent>
					{propertyTypes.map(type => (
						<SelectItem key={type.value} value={type.value}>
							{type.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error?.message && (
				<p className="text-sm text-red-6">{error.message}</p>
			)}
		</div>
	)
}

export default SupabaseFormField
