/**
 * Property form submit handler utilities.
 *
 * Upload logic is handled by property-form-upload.ts.
 * This file contains the create and edit submit handlers that orchestrate
 * the form submission flow for PropertyForm.
 */

import { toast } from 'sonner'
import type { MutableRefObject } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import type { useRouter } from 'next/navigation'
import type { createLogger } from '@repo/shared/lib/frontend-logger'
import type { FileWithStatus } from './sections/property-images-create-section'
import { uploadPropertyImages } from './property-form-upload'

type Logger = ReturnType<typeof createLogger>

interface FormValues {
	name: string
	address_line1: string
	address_line2: string
	city: string
	state: string
	postal_code: string
	country: string
	property_type: string
}

interface CreatePropertyData {
	name: string
	address_line1: string
	city: string
	state: string
	postal_code: string
	country: string
	property_type: string
	status: 'active'
	address_line2?: string
}

interface UpdatePropertyData {
	name: string
	address_line1: string
	city: string
	state: string
	postal_code: string
	country: string
	property_type: string
	address_line2?: string
}

export interface HandleCreateParams {
	value: FormValues
	userId: string | undefined
	filesWithStatus: FileWithStatus[]
	showSuccessState: boolean
	logger: Logger
	createPropertyMutation: {
		mutateAsync: (data: CreatePropertyData) => Promise<{ id: string }>
	}
	supabase: SupabaseClient
	queryClient: QueryClient
	setUploadingImages: (v: boolean) => void
	setFilesWithStatus: (fn: (prev: FileWithStatus[]) => FileWithStatus[]) => void
	setIsSubmitted: (v: boolean) => void
	isMountedRef: MutableRefObject<boolean>
	resetForm: () => void
}

export interface HandleEditParams {
	value: FormValues
	propertyId: string | undefined
	onSuccess: (() => void) | undefined
	logger: Logger
	router: ReturnType<typeof useRouter>
	updatePropertyMutation: {
		mutateAsync: (params: { id: string; data: UpdatePropertyData }) => Promise<unknown>
	}
}

export async function handleCreateSubmit({
	value,
	userId,
	filesWithStatus,
	showSuccessState,
	logger,
	createPropertyMutation,
	supabase,
	queryClient,
	setUploadingImages,
	setFilesWithStatus,
	setIsSubmitted,
	isMountedRef,
	resetForm
}: HandleCreateParams): Promise<void> {
	if (!userId) {
		toast.error('You must be logged in to create a property')
		logger.error('User not authenticated', { action: 'formSubmission' })
		return
	}
	const createData: CreatePropertyData = {
		name: value.name,
		address_line1: value.address_line1,
		city: value.city,
		state: value.state,
		postal_code: value.postal_code,
		country: value.country,
		property_type: value.property_type,
		status: 'active',
		...(value.address_line2 ? { address_line2: value.address_line2 } : {})
	}
	logger.info('Creating property', { action: 'formSubmission', data: createData })

	const newProperty = await createPropertyMutation.mutateAsync(createData)

	if (filesWithStatus.length > 0) {
		await uploadPropertyImages({
			propertyId: newProperty.id,
			files: filesWithStatus,
			supabase,
			queryClient,
			isMountedRef,
			setUploadingImages,
			setFilesWithStatus
		})
	} else {
		toast.success('Property created successfully')
	}

	if (showSuccessState) {
		setIsSubmitted(true)
	}
	resetForm()
}

export async function handleEditSubmit({
	value,
	propertyId,
	onSuccess,
	logger,
	router,
	updatePropertyMutation
}: HandleEditParams): Promise<void> {
	if (!propertyId) {
		toast.error('Property ID is missing')
		return
	}
	const updateData: UpdatePropertyData = {
		name: value.name,
		address_line1: value.address_line1,
		city: value.city,
		state: value.state,
		postal_code: value.postal_code,
		country: value.country,
		property_type: value.property_type,
		...(value.address_line2 ? { address_line2: value.address_line2 } : {})
	}
	logger.info('Updating property', {
		action: 'formSubmission',
		property_id: propertyId,
		data: updateData
	})

	await updatePropertyMutation.mutateAsync({ id: propertyId, data: updateData })
	toast.success('Property updated successfully')

	if (!onSuccess) {
		router.back()
	}
}
