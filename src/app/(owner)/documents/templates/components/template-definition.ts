'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { DynamicField } from './dynamic-form'

/**
 * Generic form interface that works with TanStack Form's strict typing.
 * Uses a more flexible approach to handle dynamic field access.
 */
interface FormLike {
	setFieldValue: (name: never, value: unknown) => void
	state: { values: Record<string, unknown> }
}

export function useTemplateDefinition(
	_templateKey: string,
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
				// Template definitions are loaded from edge function when available.
				// Returns empty custom fields as fallback.
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
	}, [_templateKey])

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

	const allFields = [...baseFields, ...customFields]

	const save = async () => {
		setIsSaving(true)
		try {
			toast.info('Template saving is not yet available')
		} finally {
			setIsSaving(false)
		}
	}

	return {
		customFields,
		setCustomFields,
		fields: allFields,
		isLoading,
		isSaving,
		save
	}
}
