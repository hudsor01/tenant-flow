/**
 * Form Pattern Components
 *
 * Reusable form patterns that eliminate duplication across
 * property forms, tenant forms, lease forms, etc.
 *
 * These components provide consistent form layouts,
 * validation patterns, and interaction behaviors.
 */

'use client'

import React from 'react'
import { motion } from '@/lib/framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/primitives'
import { Stack } from '@/components/ui/primitives'
import { FormSection } from '@/components/common/ui-patterns'
import { Save, X, Plus, Trash2, Upload } from 'lucide-react'

// ============================================================================
// FORM CONTAINER PATTERN
// ============================================================================

interface FormContainerProps extends React.FormHTMLAttributes<HTMLFormElement> {
	title?: string
	description?: string
	sections?: boolean
	loading?: boolean
	error?: string
	success?: string
}

export function FormContainer({
	title,
	description,
	sections = true,
	loading = false,
	error,
	success,
	children,
	className,
	...props
}: FormContainerProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={cn('space-y-8', className)}
		>
			<form {...props}>
				{(title || description) && (
					<div className="space-y-2">
						{title && (
							<h2 className="text-2xl font-semibold">{title}</h2>
						)}
						{description && (
							<p className="text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				)}

				{error && (
					<div className="rounded-md border border-red-200 bg-red-50 p-4">
						<div className="text-sm text-red-800">{error}</div>
					</div>
				)}

				{success && (
					<div className="rounded-md border border-green-200 bg-green-50 p-4">
						<div className="text-sm text-green-800">{success}</div>
					</div>
				)}

				<div className={sections ? 'space-y-12' : 'space-y-6'}>
					{children}
				</div>

				{loading && (
					<div className="bg-background/50 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
						<div className="bg-card rounded-lg p-6 shadow-lg">
							<div className="flex items-center gap-3">
								<div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
								<span>Saving...</span>
							</div>
						</div>
					</div>
				)}
			</form>
		</motion.div>
	)
}

// ============================================================================
// FORM FIELD PATTERNS
// ============================================================================

interface FormFieldProps {
	label: string
	name: string
	required?: boolean
	error?: string
	hint?: string
	className?: string
	children: React.ReactNode
}

export function FormField({
	label,
	name,
	required = false,
	error,
	hint,
	className,
	children
}: FormFieldProps) {
	return (
		<div className={cn('space-y-2', className)}>
			<Label htmlFor={name} className="text-sm font-medium">
				{label}
				{required && <span className="ml-1 text-red-500">*</span>}
			</Label>
			{children}
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	)
}

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label: string
	name: string
	required?: boolean
	error?: string
	hint?: string
}

export function TextField({
	label,
	name,
	required = false,
	error,
	hint,
	className,
	...props
}: TextFieldProps) {
	// Extract aria-invalid to avoid type conflicts
	const { 'aria-invalid': _ariaInvalid, ...restProps } = props as Record<
		string,
		unknown
	>

	return (
		<FormField
			label={label}
			name={name}
			required={required}
			error={error}
			hint={hint}
		>
			<Input
				id={name}
				name={name}
				aria-invalid={!!error}
				aria-describedby={
					error ? `${name}-error` : hint ? `${name}-hint` : undefined
				}
				className={cn(
					error && 'border-red-300 focus:border-red-500',
					className
				)}
				{...restProps}
			/>
		</FormField>
	)
}

interface TextAreaFieldProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label: string
	name: string
	required?: boolean
	error?: string
	hint?: string
}

export function TextAreaField({
	label,
	name,
	required = false,
	error,
	hint,
	className,
	...props
}: TextAreaFieldProps) {
	return (
		<FormField
			label={label}
			name={name}
			required={required}
			error={error}
			hint={hint}
		>
			<Textarea
				id={name}
				name={name}
				className={cn(
					error && 'border-red-300 focus:border-red-500',
					className
				)}
				{...props}
			/>
		</FormField>
	)
}

interface SelectFieldProps {
	label: string
	name: string
	required?: boolean
	error?: string
	hint?: string
	placeholder?: string
	options: { value: string; label: string }[]
	value?: string
	onValueChange?: (value: string) => void
}

export function SelectField({
	label,
	name,
	required = false,
	error,
	hint,
	placeholder = 'Select an option',
	options,
	value,
	onValueChange
}: SelectFieldProps) {
	return (
		<FormField
			label={label}
			name={name}
			required={required}
			error={error}
			hint={hint}
		>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger
					className={cn(
						error && 'border-red-300 focus:border-red-500'
					)}
				>
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
		</FormField>
	)
}

interface CheckboxFieldProps {
	label: string
	name: string
	description?: string
	error?: string
	checked?: boolean
	onCheckedChange?: (checked: boolean) => void
}

export function CheckboxField({
	label,
	name,
	description,
	error,
	checked,
	onCheckedChange
}: CheckboxFieldProps) {
	return (
		<div className="space-y-2">
			<div className="items-top flex space-x-3">
				<Checkbox
					id={name}
					name={name}
					checked={checked}
					onCheckedChange={onCheckedChange}
					className={cn(error && 'border-red-300')}
				/>
				<div className="grid gap-1.5 leading-none">
					<Label
						htmlFor={name}
						className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						{label}
					</Label>
					{description && (
						<p className="text-muted-foreground text-xs">
							{description}
						</p>
					)}
				</div>
			</div>
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	)
}

interface SwitchFieldProps {
	label: string
	name: string
	description?: string
	error?: string
	checked?: boolean
	onCheckedChange?: (checked: boolean) => void
}

export function SwitchField({
	label,
	name,
	description,
	error,
	checked,
	onCheckedChange
}: SwitchFieldProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor={name} className="text-sm font-medium">
						{label}
					</Label>
					{description && (
						<p className="text-muted-foreground text-xs">
							{description}
						</p>
					)}
				</div>
				<Switch
					id={name}
					name={name}
					checked={checked}
					onCheckedChange={onCheckedChange}
				/>
			</div>
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	)
}

// ============================================================================
// FORM ACTIONS PATTERN
// ============================================================================

interface FormActionsProps {
	submitLabel?: string
	cancelLabel?: string
	loading?: boolean
	onCancel?: () => void
	submitVariant?: 'default' | 'destructive'
	alignment?: 'left' | 'center' | 'right' | 'between'
	className?: string
	children?: React.ReactNode
}

export function FormActions({
	submitLabel = 'Save',
	cancelLabel = 'Cancel',
	loading = false,
	onCancel,
	submitVariant = 'default',
	alignment = 'right',
	className,
	children
}: FormActionsProps) {
	const alignmentClasses = {
		left: 'justify-start',
		center: 'justify-center',
		right: 'justify-end',
		between: 'justify-between'
	}

	return (
		<div
			className={cn(
				'flex items-center gap-4 border-t pt-6',
				alignmentClasses[alignment],
				className
			)}
		>
			{alignment === 'between' && children && (
				<div className="flex-1">{children}</div>
			)}

			<div className="flex items-center gap-2">
				{children && alignment !== 'between' && children}

				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={loading}
					>
						<X className="mr-2 h-4 w-4" />
						{cancelLabel}
					</Button>
				)}

				<Button
					type="submit"
					variant={submitVariant}
					disabled={loading}
					className="min-w-24"
				>
					{loading ? (
						<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
					) : (
						<Save className="mr-2 h-4 w-4" />
					)}
					{loading ? 'Saving...' : submitLabel}
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// MULTI-STEP FORM PATTERN
// ============================================================================

interface Step {
	id: string
	title: string
	description?: string
}

interface MultiStepFormProps {
	steps: Step[]
	currentStep: string
	onStepChange?: (stepId: string) => void
	children: React.ReactNode
	className?: string
}

export function MultiStepForm({
	steps,
	currentStep,
	onStepChange,
	children,
	className
}: MultiStepFormProps) {
	const currentIndex = steps.findIndex(step => step.id === currentStep)

	return (
		<div className={cn('space-y-8', className)}>
			{/* Step Indicator */}
			<nav aria-label="Progress">
				<ol className="flex items-center">
					{steps.map((step, index) => {
						const isCurrentStep = step.id === currentStep
						const isCompleted = index < currentIndex
						const isClickable =
							onStepChange &&
							(isCompleted || index <= currentIndex + 1)

						return (
							<li
								key={step.id}
								className={cn(
									'relative',
									index !== steps.length - 1 &&
										'pr-8 sm:pr-20'
								)}
							>
								{/* Connector Line */}
								{index !== steps.length - 1 && (
									<div
										className="absolute inset-0 flex items-center"
										aria-hidden="true"
									>
										<div
											className={cn(
												'h-0.5 w-full',
												isCompleted ||
													index < currentIndex
													? 'bg-primary'
													: 'bg-muted'
											)}
										/>
									</div>
								)}

								{/* Step Button */}
								<button
									type="button"
									className={cn(
										'relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
										isCurrentStep &&
											'border-primary bg-primary text-primary-foreground',
										isCompleted &&
											'border-primary bg-primary text-primary-foreground',
										!isCurrentStep &&
											!isCompleted &&
											'border-muted bg-background text-muted-foreground',
										isClickable &&
											'hover:border-primary/50 transition-colors'
									)}
									onClick={
										isClickable
											? () => onStepChange?.(step.id)
											: undefined
									}
									disabled={!isClickable}
									aria-current={
										isCurrentStep ? 'step' : undefined
									}
								>
									{isCompleted ? (
										<svg
											className="h-4 w-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clipRule="evenodd"
											/>
										</svg>
									) : (
										<span>{index + 1}</span>
									)}
								</button>

								{/* Step Label */}
								<div className="absolute top-10 left-1/2 -translate-x-1/2 transform whitespace-nowrap">
									<p
										className={cn(
											'text-xs font-medium',
											isCurrentStep && 'text-primary',
											isCompleted && 'text-primary',
											!isCurrentStep &&
												!isCompleted &&
												'text-muted-foreground'
										)}
									>
										{step.title}
									</p>
								</div>
							</li>
						)
					})}
				</ol>
			</nav>

			{/* Step Content */}
			<div className="mt-16">{children}</div>
		</div>
	)
}

// ============================================================================
// DYNAMIC LIST PATTERN
// ============================================================================

interface DynamicListItem {
	id: string
	[key: string]: unknown
}

interface DynamicListProps<T extends DynamicListItem> {
	label: string
	description?: string
	items: T[]
	onAdd: () => void
	onRemove: (id: string) => void
	renderItem: (item: T, index: number) => React.ReactNode
	addLabel?: string
	emptyMessage?: string
	max?: number
	className?: string
}

export function DynamicList<T extends DynamicListItem>({
	label,
	description,
	items,
	onAdd,
	onRemove,
	renderItem,
	addLabel = 'Add Item',
	emptyMessage = 'No items added yet',
	max,
	className
}: DynamicListProps<T>) {
	const canAdd = !max || items.length < max

	return (
		<FormSection
			title={label}
			description={description}
			className={className}
		>
			<div className="space-y-4">
				{items.length === 0 ? (
					<div className="text-muted-foreground py-8 text-center">
						{emptyMessage}
					</div>
				) : (
					<Stack spacing="md">
						{items.map((item, index) => (
							<Card key={item.id} variant="elevated">
								<CardContent className="pt-6">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1">
											{renderItem(item, index)}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => onRemove(item.id)}
											className="text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</Stack>
				)}

				{canAdd && (
					<Button
						type="button"
						variant="outline"
						onClick={onAdd}
						className="w-full"
					>
						<Plus className="mr-2 h-4 w-4" />
						{addLabel}
					</Button>
				)}
			</div>
		</FormSection>
	)
}

// ============================================================================
// FILE UPLOAD PATTERN
// ============================================================================

interface FileUploadProps {
	label: string
	name: string
	accept?: string
	multiple?: boolean
	required?: boolean
	error?: string
	hint?: string
	maxSize?: number
	value?: File[]
	onChange?: (files: File[]) => void
	className?: string
}

export function FileUpload({
	label,
	name,
	accept,
	multiple = false,
	required = false,
	error,
	hint,
	maxSize,
	value = [],
	onChange,
	className
}: FileUploadProps) {
	const fileInputRef = React.useRef<HTMLInputElement>(null)

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])

		// Validate file size
		if (maxSize) {
			const oversizedFiles = files.filter(file => file.size > maxSize)
			if (oversizedFiles.length > 0) {
				// Handle error - could be passed up via onChange or error prop
				return
			}
		}

		onChange?.(files)
	}

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	return (
		<FormField
			label={label}
			name={name}
			required={required}
			error={error}
			hint={hint}
			className={className}
		>
			<div className="space-y-4">
				{/* Upload Area */}
				<div
					className={cn(
						'hover:border-primary/50 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
						error ? 'border-red-300' : 'border-muted'
					)}
					onClick={() => fileInputRef.current?.click()}
				>
					<Upload className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
					<p className="text-muted-foreground text-sm">
						Click to upload {multiple ? 'files' : 'a file'} or drag
						and drop
					</p>
					{hint && (
						<p className="text-muted-foreground mt-1 text-xs">
							{hint}
						</p>
					)}
				</div>

				{/* Hidden File Input */}
				<input
					ref={fileInputRef}
					type="file"
					name={name}
					accept={accept}
					multiple={multiple}
					onChange={handleFileChange}
					className="hidden"
				/>

				{/* File List */}
				{value.length > 0 && (
					<div className="space-y-2">
						{value.map((file, index) => (
							<div
								key={index}
								className="bg-muted/30 flex items-center justify-between rounded-md p-3"
							>
								<div className="flex-1">
									<p className="truncate text-sm font-medium">
										{file.name}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatFileSize(file.size)}
									</p>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										const newFiles = value.filter(
											(_, i) => i !== index
										)
										onChange?.(newFiles)
									}}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</FormField>
	)
}

// ============================================================================
// FORM STATE HELPERS
// ============================================================================

export interface FormState {
	loading: boolean
	error?: string
	success?: string
	touched: Record<string, boolean>
	errors: Record<string, string>
}

export const useFormState = (initialState?: Partial<FormState>) => {
	const [state, setState] = React.useState<FormState>({
		loading: false,
		touched: {},
		errors: {},
		...initialState
	})

	const setLoading = (loading: boolean) =>
		setState(prev => ({ ...prev, loading }))

	const setError = (error?: string) =>
		setState(prev => ({ ...prev, error, success: undefined }))

	const setSuccess = (success?: string) =>
		setState(prev => ({ ...prev, success, error: undefined }))

	const setFieldError = (field: string, error?: string) =>
		setState(prev => ({
			...prev,
			errors: { ...prev.errors, [field]: error || '' }
		}))

	const setTouched = (field: string, touched = true) =>
		setState(prev => ({
			...prev,
			touched: { ...prev.touched, [field]: touched }
		}))

	const reset = () => setState({ loading: false, touched: {}, errors: {} })

	return {
		state,
		setLoading,
		setError,
		setSuccess,
		setFieldError,
		setTouched,
		reset
	}
}
