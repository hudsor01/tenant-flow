'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Plus, Save, Trash2 } from 'lucide-react'
import type { DynamicField } from './dynamic-form'

const fieldTypes: Array<DynamicField['type']> = [
	'text',
	'email',
	'tel',
	'number',
	'date',
	'textarea',
	'select',
	'checkbox'
]

/** Regex for valid field names: alphanumeric and underscores, starting with letter */
const VALID_FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/

/** Generate a unique field name using timestamp to avoid collisions */
function generateUniqueFieldName(): string {
	return `customField_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** Validate a field name for uniqueness and format */
function validateFieldName(
	name: string,
	existingNames: string[],
	currentIndex: number
): string | null {
	if (!name.trim()) {
		return 'Field key is required'
	}
	if (!VALID_FIELD_NAME_PATTERN.test(name)) {
		return 'Field key must start with a letter and contain only letters, numbers, and underscores'
	}
	const isDuplicate = existingNames.some(
		(existingName, idx) => idx !== currentIndex && existingName === name
	)
	if (isDuplicate) {
		return 'Field key must be unique'
	}
	return null
}

interface FormBuilderPanelProps {
	fields: DynamicField[]
	onChange: (fields: DynamicField[]) => void
	onSave: () => Promise<void>
	isSaving: boolean
}

export function FormBuilderPanel({
	fields,
	onChange,
	onSave,
	isSaving
}: FormBuilderPanelProps) {
	const [fieldErrors, setFieldErrors] = React.useState<Record<number, string | null>>({})

	const handleAdd = () => {
		onChange([
			...fields,
			{
				name: generateUniqueFieldName(),
				label: 'New field',
				type: 'text',
				section: 'Custom fields',
				fullWidth: true
			}
		])
	}

	const updateField = <K extends keyof DynamicField>(
		index: number,
		key: K,
		value: DynamicField[K]
	) => {
		if (key === 'name' && typeof value === 'string') {
			const existingNames = fields.map(f => f.name)
			const error = validateFieldName(value, existingNames, index)
			setFieldErrors(prev => ({ ...prev, [index]: error }))
		}

		onChange(
			fields.map((field, idx) =>
				idx === index ? { ...field, [key]: value } : field
			)
		)
	}

	const removeField = (index: number) => {
		onChange(fields.filter((_, idx) => idx !== index))
	}

	const parseOptions = (value: string) =>
		value
			.split(',')
			.map(option => option.trim())
			.filter(Boolean)
			.map(option => ({ value: option, label: option }))

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Form builder</CardTitle>
					<p className="text-sm text-muted-foreground">
						Add custom fields that appear in the live template form and PDF.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleAdd}
					>
						<Plus className="mr-2 size-4" />
						Add field
					</Button>
					<Button type="button" onClick={onSave} disabled={isSaving}>
						<Save className="mr-2 size-4" />
						{isSaving ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{fields.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No custom fields added yet.
					</p>
				) : null}
				{fields.map((field, index) => (
					<div key={`builder-field-${index}`} className="space-y-3 rounded border p-4">
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold">Custom field {index + 1}</p>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => removeField(index)}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Label</Label>
								<Input
									value={field.label}
									onChange={event =>
										updateField(index, 'label', event.target.value)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Field key</Label>
								<Input
									value={field.name}
									onChange={event =>
										updateField(index, 'name', event.target.value)
									}
									className={fieldErrors[index] ? 'border-destructive' : ''}
								/>
								{fieldErrors[index] ? (
									<p className="text-xs text-destructive">{fieldErrors[index]}</p>
								) : null}
							</div>
							<div className="space-y-2">
								<Label>Type</Label>
								<Select
									value={field.type}
									onValueChange={value =>
										updateField(index, 'type', value as DynamicField['type'])
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										{fieldTypes.map(type => (
											<SelectItem key={type} value={type}>
												{type}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Section</Label>
								<Input
									value={field.section ?? ''}
									onChange={event =>
										updateField(index, 'section', event.target.value)
									}
									placeholder="Custom fields"
								/>
							</div>
							{field.type === 'select' ? (
								<div className="space-y-2 sm:col-span-2">
									<Label>Options (comma-separated)</Label>
									<Input
										value={field.options?.map(option => option.value).join(', ') ?? ''}
										onChange={event =>
											updateField(index, 'options', parseOptions(event.target.value))
										}
									/>
								</div>
							) : null}
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}
