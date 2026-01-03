'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '#lib/api-request'
import { toast } from 'sonner'
import type { DynamicField } from './dynamic-form'

interface TemplateDefinitionResponse {
	fields?: DynamicField[]
}

/**
 * Generic form interface that works with TanStack Form's strict typing.
 * Uses a more flexible approach to handle dynamic field access.
 */
interface FormLike {
	setFieldValue: (name: never, value: unknown) => void
	state: { values: Record<string, unknown> }
}

export function useTemplateDefinition(
	templateKey: string,
	baseFields: DynamicField[],
	form?: FormLike
) {
	const [customFields, setCustomFields] = useState<DynamicField[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		let isActive = true

		async function load() {
			try {
				const response = await apiRequest<TemplateDefinitionResponse>(
					`/documents/templates/${templateKey}/definition`
				)
				if (!isActive) return
				const fields = Array.isArray(response.fields) ? response.fields : []
				setCustomFields(fields)
			} catch {
				if (isActive) {
					setCustomFields([])
				}
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void load()
		return () => {
			isActive = false
		}
	}, [templateKey])

	useEffect(() => {
		if (!form) return
		customFields.forEach(field => {
			if (form.state.values[field.name] !== undefined) return
			const defaultValue =
			field.type === 'checkbox'
				? false
				: field.type === 'select'
					? field.options?.[0]?.value ?? ''
					: ''
			// Cast to never for dynamic field names (TanStack Form requires exact field types)
			form.setFieldValue(field.name as never, defaultValue)
		})
	}, [customFields, form])

	const allFields = useMemo(
		() => [...baseFields, ...customFields],
		[baseFields, customFields]
	)

	const save = useCallback(async () => {
		setIsSaving(true)
		try {
			await apiRequest(`/documents/templates/${templateKey}/definition`, {
				method: 'POST',
				body: JSON.stringify({ fields: customFields })
			})
			toast.success('Template fields saved')
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to save template fields'
			)
		} finally {
			setIsSaving(false)
		}
	}, [customFields, templateKey])

	return {
		customFields,
		setCustomFields,
		fields: allFields,
		isLoading,
		isSaving,
		save
	}
}
