'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Badge } from '#components/ui/badge'
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
import { tenantNoticeSchema } from './template-schemas'

const defaultBranding: BrandingInfo = {
	companyName: 'TenantFlow Properties',
	logoUrl: null,
	primaryColor: 'oklch(0.35 0.08 250)'
}

const noticeTypes = [
	{ value: 'late-rent', label: 'Late rent notice' },
	{ value: 'lease-violation', label: 'Lease violation notice' },
	{ value: 'move-out', label: 'Move-out notice' }
]

export function TenantNoticeTemplate() {
	const [branding, setBranding] = React.useState(defaultBranding)
	const form = useForm({
		defaultValues: {
			noticeType: 'late-rent',
			tenantName: 'Jordan Lee',
			propertyAddress: '789 Mission Street, Unit 12, San Francisco, CA 94103',
			issueDate: '2025-01-01',
			dueDate: '2025-01-05',
			amountDue: '1850',
			details:
				'Payment has not been received. Please remit immediately to avoid further action.'
		},
		validators: {
			onBlur: ({ value }) => {
				const result = tenantNoticeSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			},
			onSubmitAsync: ({ value }) => {
				const result = tenantNoticeSchema.safeParse(value)
				if (!result.success) {
					return z.treeifyError(result.error)
				}
				return undefined
			}
		}
	})
	const [customFields, setCustomFields] = React.useState<CustomField[]>([])
	const [clauses, setClauses] = React.useState<ClauseItem[]>([{
		id: 'notice-1',
		text: 'Tenant has three business days to cure per state law.'
	}])

	const baseFields = React.useMemo<DynamicField[]>(
		() => [
			{
				name: 'noticeType',
				label: 'Notice type',
				type: 'select',
				section: 'Notice details',
				options: noticeTypes
			},
			{
				name: 'issueDate',
				label: 'Issue date',
				type: 'date',
				section: 'Notice details'
			},
			{
				name: 'dueDate',
				label: 'Cure by',
				type: 'date',
				section: 'Notice details'
			},
			{
				name: 'amountDue',
				label: 'Amount due',
				type: 'number',
				section: 'Notice details',
				placeholder: '$'
			},
			{
				name: 'tenantName',
				label: 'Tenant name',
				type: 'text',
				section: 'Notice details',
				fullWidth: true
			},
			{
				name: 'propertyAddress',
				label: 'Property address',
				type: 'text',
				section: 'Notice details',
				fullWidth: true
			},
			{
				name: 'details',
				label: 'Notice details',
				type: 'textarea',
				section: 'Notice details',
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
	} = useTemplateDefinition('tenant-notice', baseFields, form as never)

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
			templateTitle: 'Tenant Notice',
			state: 'CA',
			branding,
			customFields,
			clauses,
			data: {
				notice: {
					type: noticeTypes.find(type => type.value === values.noticeType)?.label,
					issueDate: values.issueDate,
					cureDate: values.dueDate,
					amountDue: values.amountDue,
					details: values.details
				},
				tenant: {
					name: values.tenantName
				},
				property: {
					address: values.propertyAddress
				},
				dynamicFields
			}
		}
	}, [branding, builderFields, clauses, customFields, form.state.values])

	const {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport
	} = useTemplatePdf('tenant-notice', getPayload)

	return (
		<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-6">
				<BrandingEditor branding={branding} onChange={setBranding} />

				<Card>
					<CardHeader>
						<CardTitle>Notice details</CardTitle>
					</CardHeader>
					<CardContent>
						<DynamicForm form={form} fields={fields} />
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
				title="Tenant Notice"
				previewUrl={previewUrl}
				isGenerating={isGeneratingPreview}
				isExporting={isExporting}
				onPreview={handlePreview}
				onExport={handleExport}
			>
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Badge variant="outline">
							{noticeTypes.find(
								type => type.value === form.state.values.noticeType
							)?.label}
						</Badge>
						<span className="text-sm text-muted-foreground">
							Issued {form.state.values.issueDate}
						</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{form.state.values.tenantName} •{' '}
						{form.state.values.propertyAddress}
					</p>
					<p className="text-sm">
						Amount due: ${form.state.values.amountDue}
					</p>
					<p className="text-sm">Cure by: {form.state.values.dueDate}</p>
				</div>
			</TemplatePreviewPanel>
		</div>
	)
}
