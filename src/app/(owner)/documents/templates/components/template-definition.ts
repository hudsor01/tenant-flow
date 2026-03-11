'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { templateDefinitionQueries } from '#hooks/api/query-keys/template-definition-keys'
import type { DynamicField } from './dynamic-form'

/**
 * Generic form interface that works with TanStack Form's strict typing.
 * Uses a more flexible approach to handle dynamic field access.
 */
interface FormLike {
	setFieldValue: (name: never, value: unknown) => void
	state: { values: Record<string, unknown> }
}

/**
 * Hook to load and save custom template field definitions from PostgREST.
 *
 * Each owner can define custom fields per template type. Definitions persist
 * in the document_template_definitions table via upsert (unique on
 * owner_user_id + template_key).
 */
export function useTemplateDefinition(
	templateKey: string,
	baseFields: DynamicField[],
	form?: FormLike
) {
	const [customFields, setCustomFields] = useState<DynamicField[]>([])
	const [isSaving, setIsSaving] = useState(false)
	const queryClient = useQueryClient()
	const loadedKeyRef = useRef<string | null>(null)

	const { data, isPending } = useQuery(
		templateDefinitionQueries.byTemplateKey(templateKey)
	)

	// Sync loaded data to local editing state (once per templateKey)
	useEffect(() => {
		if (data !== undefined && loadedKeyRef.current !== templateKey) {
			setCustomFields(data)
			loadedKeyRef.current = templateKey
		}
	}, [data, templateKey])

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
			const user = await getCachedUser()
			if (!user) {
				toast.error('Failed to save template definition')
				return
			}

			const supabase = createClient()
			const { error } = await supabase
				.from('document_template_definitions')
				.upsert(
					{
						owner_user_id: user.id,
						template_key: templateKey,
						custom_fields: customFields
					},
					{ onConflict: 'owner_user_id,template_key' }
				)

			if (error) {
				toast.error('Failed to save template definition')
				return
			}

			toast.success('Template definition saved')
			queryClient.invalidateQueries({
				queryKey: templateDefinitionQueries.all()
			})
		} catch {
			toast.error('Failed to save template definition')
		} finally {
			setIsSaving(false)
		}
	}

	return {
		customFields,
		setCustomFields,
		fields: allFields,
		isLoading: isPending,
		isSaving,
		save
	}
}
