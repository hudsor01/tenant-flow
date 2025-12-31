'use client'

import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import type { CustomField } from './template-types'

interface CustomFieldsEditorProps {
	fields: CustomField[]
	onChange: (fields: CustomField[]) => void
}

export function CustomFieldsEditor({ fields, onChange }: CustomFieldsEditorProps) {
	const handleAdd = () => {
		onChange([...fields, { label: '', value: '' }])
	}

	const handleUpdate = (
		index: number,
		key: keyof CustomField,
		value: string
	) => {
		const next = fields.map((field, idx) =>
			idx === index ? { ...field, [key]: value } : field
		)
		onChange(next)
	}

	const handleRemove = (index: number) => {
		onChange(fields.filter((_, idx) => idx !== index))
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Custom fields</CardTitle>
				<Button type="button" variant="outline" size="sm" onClick={handleAdd}>
					<Plus className="mr-2 size-4" />
					Add field
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				{fields.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Add custom fields to capture state-specific clauses or extra
						instructions.
					</p>
				) : null}
				{fields.map((field, index) => (
					<div key={`${field.label}-${index}`} className="grid gap-3">
						<div className="flex items-center justify-between">
							<Label>Field {index + 1}</Label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => handleRemove(index)}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<Input
								placeholder="Label"
								value={field.label}
								onChange={event =>
									handleUpdate(index, 'label', event.target.value)
								}
							/>
							<Input
								placeholder="Value"
								value={field.value}
								onChange={event =>
									handleUpdate(index, 'value', event.target.value)
								}
							/>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}
