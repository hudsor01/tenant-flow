'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Input } from '#components/ui/input'
import { BrandingEditor } from './branding-editor'
import { CustomFieldsEditor } from './custom-fields-editor'
import { ClausesEditor } from './clauses-editor'
import { TemplatePreviewPanel } from './template-preview-panel'
import { useTemplatePdf } from './use-template-pdf'
import { DynamicForm, type DynamicField } from './dynamic-form'
import { FormBuilderPanel } from './form-builder-panel'
import { useTemplateDefinition } from './template-definition'
import type { BrandingInfo, ClauseItem, CustomField } from './template-types'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { propertyInspectionSchema } from './template-schemas'

const defaultBranding: BrandingInfo = {
	companyName: 'TenantFlow Properties',
	logoUrl: null,
	primaryColor: 'oklch(0.35 0.08 250)'
}

const defaultChecklist = [
	{ label: 'Walls and ceilings', status: false },
	{ label: 'Flooring', status: false },
	{ label: 'Windows and locks', status: false },
	{ label: 'Appliances', status: false },
	{ label: 'Smoke detectors', status: false }
]

const defaultClauses: ClauseItem[] = [
	{
		id: 'ca-1',
		text: 'California Civil Code 1950.5 disclosure included.'
	}
]

export function PropertyInspectionTemplate() {
	const [branding, setBranding] = React.useState(defaultBranding)
	const form = useForm({
		defaultValues: {
			propertyName: 'Sunset Villas',
			propertyAddress: '123 Market Street, San Francisco, CA 94105',
			inspectionType: 'pre',
			inspectionDate: '2025-01-01',
			inspectorName: 'Jordan Miles',
			notes: 'Utilities tested, keys handed off, move-in condition documented.',
			checklist: defaultChecklist
		},
		validators: {
			onBlur: ({ value }) => {
				const result = propertyInspectionSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			},
			onSubmitAsync: ({ value }) => {
				const result = propertyInspectionSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})
	const [photos, setPhotos] = React.useState<{ url: string; name: string }[]>(
		[]
	)
	const [customFields, setCustomFields] = React.useState<CustomField[]>([])
	const [clauses, setClauses] = React.useState<ClauseItem[]>(defaultClauses)

	const baseFields = React.useMemo<DynamicField[]>(
		() => [
			{
				name: 'propertyName',
				label: 'Property name',
				type: 'text',
				section: 'Inspection details'
			},
			{
				name: 'inspectionDate',
				label: 'Inspection date',
				type: 'date',
				section: 'Inspection details'
			},
			{
				name: 'inspectionType',
				label: 'Inspection type',
				type: 'select',
				section: 'Inspection details',
				options: [
					{ value: 'pre', label: 'Pre move-in' },
					{ value: 'post', label: 'Post move-out' }
				]
			},
			{
				name: 'inspectorName',
				label: 'Inspector name',
				type: 'text',
				section: 'Inspection details'
			},
			{
				name: 'propertyAddress',
				label: 'Property address',
				type: 'text',
				section: 'Inspection details',
				fullWidth: true
			},
			{
				name: 'notes',
				label: 'Condition notes',
				type: 'textarea',
				section: 'Inspection details',
				fullWidth: true
			},
			{
				name: 'checklist',
				label: 'Checklist items',
				type: 'list',
				section: 'Checklist',
				fullWidth: true,
				itemLabel: 'Checklist item',
				addLabel: 'Add checklist item',
				itemFields: [
					{ key: 'label', label: 'Item', type: 'text' },
					{ key: 'status', label: 'Completed', type: 'checkbox' }
				]
			}
		],
		[]
	)

	const {
		fields,
		customFields: builderFields,
		setCustomFields: setBuilderFields,
		isSaving: isSavingFields,
		save: saveFields
	} = useTemplateDefinition('property-inspection', baseFields, form as never)

	const getPayload = React.useCallback(() => {
		const values = form.state.values as Record<string, unknown>
		const dynamicFields = builderFields.map(field => ({
			label: field.label,
			value:
				field.type === 'checkbox'
					? values[field.name]
						? 'Yes'
						: 'No'
					: String(values[field.name] ?? '')
		}))
		return {
			templateTitle: 'Property Inspection Report',
			state: 'CA',
			branding,
			customFields,
			clauses,
			data: {
				property: {
					name: values.propertyName,
					address: values.propertyAddress
				},
				inspection: {
					type:
						values.inspectionType === 'pre' ? 'Pre move-in' : 'Post move-out',
					date: values.inspectionDate,
					inspector: values.inspectorName,
					notes: values.notes
				},
				checklist: values.checklist ?? [],
				photos,
				dynamicFields
			}
		}
	}, [branding, builderFields, clauses, customFields, form.state.values, photos])

	const {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport
	} = useTemplatePdf('property-inspection', getPayload)

	const handlePhotoUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = Array.from(event.target.files ?? [])
		if (files.length === 0) return

		const uploaded = await Promise.all(
			files.map(file =>
				new Promise<{ url: string; name: string }>(resolve => {
					const reader = new FileReader()
					reader.onload = () => {
						resolve({
							url: typeof reader.result === 'string' ? reader.result : '',
							name: file.name
						})
					}
					reader.readAsDataURL(file)
				})
			)
		)

		setPhotos(current => [...current, ...uploaded.filter(photo => photo.url)])
	}

	const removePhoto = (index: number) => {
		setPhotos(current => current.filter((_, idx) => idx !== index))
	}

	const inspectionType = form.state.values.inspectionType as 'pre' | 'post'

	return (
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-6">
				<BrandingEditor branding={branding} onChange={setBranding} />
				<Card>
					<CardHeader>
						<CardTitle>Inspection details</CardTitle>
					</CardHeader>
					<CardContent>
						<DynamicForm form={form} fields={fields} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Photo evidence</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Input
							type="file"
							multiple
							accept="image/*"
							onChange={handlePhotoUpload}
						/>
						{photos.length > 0 ? (
							<div className="grid gap-3 sm:grid-cols-2">
								{photos.map((photo, index) => (
									<div
										key={`${photo.name}-${index}`}
										className="rounded border p-2"
									>
										<img
											src={photo.url}
											alt={photo.name}
											className="h-32 w-full rounded object-cover"
										/>
										<div className="mt-2 flex items-center justify-between text-sm">
											<span className="truncate">{photo.name}</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removePhoto(index)}
											>
												Remove
											</Button>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								Upload photos to attach to the inspection report.
							</p>
						)}
					</CardContent>
				</Card>

				<CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
				<ClausesEditor clauses={clauses} onChange={setClauses} />
				<FormBuilderPanel
					fields={builderFields}
					onChange={setBuilderFields}
					onSave={saveFields}
					isSaving={isSavingFields}
				/>
			</div>

			<TemplatePreviewPanel
				title="Property Inspection"
				previewUrl={previewUrl}
				isGenerating={isGeneratingPreview}
				isExporting={isExporting}
				onPreview={handlePreview}
				onExport={handleExport}
			>
				<div className="space-y-3">
					<div className="flex items-center gap-2">
					<Badge variant="outline">
						{inspectionType === 'pre' ? 'Pre move-in' : 'Post move-out'}
					</Badge>
					<span className="text-sm text-muted-foreground">
						{form.state.values.inspectionDate} •{' '}
						{form.state.values.inspectorName}
					</span>
				</div>
				<p className="text-sm text-muted-foreground">
					{form.state.values.propertyName} —{' '}
					{form.state.values.propertyAddress}
				</p>
					<ul className="grid gap-2 text-sm">
						{(form.state.values.checklist as Array<{ label: string; status: boolean }> | undefined)
							?.slice(0, 5)
							.map(item => (
								<li key={item.label} className="flex items-center gap-2">
									<span
										className={`h-2 w-2 rounded-full ${
											item.status ? 'bg-primary' : 'bg-muted-foreground'
										}`}
									/>
									{item.label}
								</li>
							))}
					</ul>
				</div>
			</TemplatePreviewPanel>
		</div>
	)
}
