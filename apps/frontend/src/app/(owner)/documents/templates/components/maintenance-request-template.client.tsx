'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import { BrandingEditor } from './branding-editor'
import { CustomFieldsEditor } from './custom-fields-editor'
import { TemplatePreviewPanel } from './template-preview-panel'
import { useTemplatePdf } from './use-template-pdf'
import { DynamicForm, type DynamicField } from './dynamic-form'
import { FormBuilderPanel } from './form-builder-panel'
import { useTemplateDefinition } from './template-definition'
import type { BrandingInfo, CustomField } from './template-types'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { maintenanceRequestSchema } from './template-schemas'

const defaultBranding: BrandingInfo = {
	companyName: 'TenantFlow Properties',
	logoUrl: null,
	primaryColor: 'oklch(0.35 0.08 250)'
}

const priorities = [
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
	{ value: 'urgent', label: 'Urgent' }
]

export function MaintenanceRequestTemplate() {
	const [branding, setBranding] = React.useState(defaultBranding)
	const form = useForm({
		defaultValues: {
			propertyName: 'Bayview Residences',
			unit: 'Unit 3A',
			requesterName: 'Sam Rivera',
			requesterPhone: '(510) 555-2200',
			requesterEmail: 'sam@email.com',
			priority: 'medium',
			preferredDate: '2025-01-03',
			accessNotes: 'Lockbox code 1200, pets in unit.',
			description:
				'Kitchen faucet leaking. Tenant notes water pooling under the sink.'
		},
		validators: {
			onBlur: ({ value }) => {
				const result = maintenanceRequestSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			},
			onSubmitAsync: ({ value }) => {
				const result = maintenanceRequestSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})
	const [customFields, setCustomFields] = React.useState<CustomField[]>([])

	const baseFields = React.useMemo<DynamicField[]>(
		() => [
			{
				name: 'propertyName',
				label: 'Property name',
				type: 'text',
				section: 'Request details'
			},
			{
				name: 'unit',
				label: 'Unit',
				type: 'text',
				section: 'Request details'
			},
			{
				name: 'requesterName',
				label: 'Requester name',
				type: 'text',
				section: 'Request details'
			},
			{
				name: 'requesterPhone',
				label: 'Requester phone',
				type: 'tel',
				section: 'Request details'
			},
			{
				name: 'requesterEmail',
				label: 'Requester email',
				type: 'email',
				section: 'Request details'
			},
			{
				name: 'priority',
				label: 'Priority',
				type: 'select',
				section: 'Request details',
				options: priorities
			},
			{
				name: 'preferredDate',
				label: 'Preferred service date',
				type: 'date',
				section: 'Request details',
				fullWidth: true
			},
			{
				name: 'description',
				label: 'Issue description',
				type: 'textarea',
				section: 'Request details',
				fullWidth: true
			},
			{
				name: 'accessNotes',
				label: 'Access instructions',
				type: 'textarea',
				section: 'Request details',
				fullWidth: true
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
	} = useTemplateDefinition('maintenance-request', baseFields, form as never)

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
			templateTitle: 'Maintenance Request Form',
			branding,
			customFields,
			clauses: [],
			data: {
				property: {
					name: values.propertyName,
					unit: values.unit
				},
				requester: {
					name: values.requesterName,
					phone: values.requesterPhone,
					email: values.requesterEmail
				},
				request: {
					priority: values.priority,
					preferredDate: values.preferredDate,
					accessNotes: values.accessNotes,
					description: values.description
				},
				dynamicFields
			}
		}
	}, [branding, builderFields, customFields, form.state.values])

	const {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport
	} = useTemplatePdf('maintenance-request', getPayload)

	return (
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-6">
				<BrandingEditor branding={branding} onChange={setBranding} />

				<Card>
					<CardHeader>
						<CardTitle>Request details</CardTitle>
					</CardHeader>
					<CardContent>
						<DynamicForm form={form} fields={fields} />
					</CardContent>
				</Card>

				<CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
				<FormBuilderPanel
					fields={builderFields}
					onChange={setBuilderFields}
					onSave={saveFields}
					isSaving={isSavingFields}
				/>
			</div>

			<TemplatePreviewPanel
				title="Maintenance Request"
				previewUrl={previewUrl}
				isGenerating={isGeneratingPreview}
				isExporting={isExporting}
				onPreview={handlePreview}
				onExport={handleExport}
			>
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Badge variant="outline">{form.state.values.propertyName}</Badge>
						<span className="text-sm text-muted-foreground">
							{form.state.values.unit}
						</span>
					</div>
					<p className="text-sm">
						Requester: {form.state.values.requesterName}
					</p>
					<p className="text-sm">Priority: {form.state.values.priority}</p>
					<p className="text-sm">
						Preferred date: {form.state.values.preferredDate}
					</p>
				</div>
			</TemplatePreviewPanel>
		</div>
	)
}
