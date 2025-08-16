'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	propertyFormSchema,
	type PropertyFormData
} from '@repo/shared/validation/properties'
import { usePostHog } from '@/hooks/use-posthog'
import { usePropertyTracking } from '@/hooks/use-property-tracking'
import {
	useBusinessEvents,
	useInteractionTracking
} from '@/lib/analytics/business-events'
import { TrackButton } from '@/components/analytics/track-button'
import type { Property } from '@repo/shared'

interface PropertyFormProps {
	property?: Property
	onSubmit: (data: PropertyFormData) => Promise<void>
	onCancel: () => void
}

export function PropertyFormWithTracking({
	property,
	onSubmit,
	onCancel
}: PropertyFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const { trackEvent, trackTiming } = usePostHog()
	const { trackPropertyCreate, trackPropertyUpdate } = usePropertyTracking()
	const { trackPropertyCreated, trackPropertyUpdated, trackUserError } =
		useBusinessEvents()
	const { trackFormSubmission } = useInteractionTracking()
	const [formStartTime] = useState(Date.now())

	const form = useForm<PropertyFormData>({
		resolver: zodResolver(propertyFormSchema),
		defaultValues: property
			? {
					name: property.name || '',
					description: property.description || undefined,
					propertyType: property.propertyType || 'SINGLE_FAMILY',
					address: property.address || '',
					city: property.city || '',
					state: property.state || '',
					zipCode: property.zipCode || ''
				}
			: {
					propertyType: 'SINGLE_FAMILY'
				}
	})

	const handleSubmit = async (data: PropertyFormData) => {
		setIsSubmitting(true)
		const submitStartTime = Date.now()

		try {
			// Track form submission timing
			trackTiming(
				'form',
				'property_form_fill_time',
				Date.now() - formStartTime,
				'property_form'
			)

			// Track the create/update event (legacy)
			if (property) {
				trackPropertyUpdate(property.id, data)
			} else {
				trackPropertyCreate(data)
			}

			// Submit the form
			const _result = await onSubmit(data)

			// Track successful submission timing
			trackTiming(
				'api',
				'property_save_time',
				Date.now() - submitStartTime,
				'property_form'
			)

			// Track form submission success
			trackFormSubmission('property_form', true)

			// Track business event with rich data
			if (property) {
				trackPropertyUpdated({
					property_id: property.id,
					property_type: data.propertyType,
					monthly_rent: data.rent ? parseFloat(data.rent) : undefined,
					has_photos: false // TODO: Add photo detection
				})
			} else {
				trackPropertyCreated({
					property_id: 'temp-id', // Will be updated when we get the actual ID back
					property_type: data.propertyType,
					unit_count:
						data.propertyType === 'MULTI_UNIT' ? 1 : undefined,
					monthly_rent: data.rent ? parseFloat(data.rent) : undefined,
					has_photos: false // TODO: Add photo detection
				})
			}

			// Track conversion goal (legacy)
			trackEvent(property ? 'property_updated' : 'property_created', {
				success: true,
				form_fill_time: Date.now() - formStartTime,
				api_response_time: Date.now() - submitStartTime
			})
		} catch (error) {
			// Track form submission failure
			trackFormSubmission('property_form', false, [
				error instanceof Error ? error.message : 'Unknown error'
			])

			// Track user error for support
			trackUserError({
				error_type: 'form_submission_failed',
				error_message:
					error instanceof Error ? error.message : 'Unknown error',
				page_url: window.location.href,
				user_action: property ? 'update_property' : 'create_property'
			})

			// Track error (legacy)
			trackEvent('error_occurred', {
				error_type: 'property_form_submission',
				error_message:
					error instanceof Error ? error.message : 'Unknown error',
				property_id: property?.id
			})

			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	// Track field interactions
	const trackFieldInteraction = (fieldName: string) => {
		trackEvent('property_viewed', {
			interaction_type: 'field_focus',
			field_name: fieldName,
			is_editing: !!property
		})
	}

	return (
		<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700">
					Property Name
				</label>
				<input
					{...form.register('name')}
					onFocus={() => trackFieldInteraction('name')}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
					placeholder="Enter property name"
				/>
				{form.formState.errors.name && (
					<p className="mt-1 text-sm text-red-600">
						{form.formState.errors.name.message}
					</p>
				)}
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700">
					Property Type
				</label>
				<select
					{...form.register('propertyType')}
					onFocus={() => trackFieldInteraction('propertyType')}
					onChange={e => {
						form.setValue(
							'propertyType',
							e.target.value as PropertyFormData['propertyType']
						)
						trackEvent('property_viewed', {
							interaction_type: 'property_type_changed',
							new_value: e.target.value
						})
					}}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
				>
					<option value="SINGLE_FAMILY">Single Family</option>
					<option value="MULTI_UNIT">Multi Unit</option>
					<option value="APARTMENT">Apartment</option>
					<option value="COMMERCIAL">Commercial</option>
				</select>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700">
						Address
					</label>
					<input
						{...form.register('address')}
						onFocus={() => trackFieldInteraction('address')}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						placeholder="123 Main St"
					/>
					{form.formState.errors.address && (
						<p className="mt-1 text-sm text-red-600">
							{form.formState.errors.address.message}
						</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700">
						City
					</label>
					<input
						{...form.register('city')}
						onFocus={() => trackFieldInteraction('city')}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						placeholder="San Francisco"
					/>
					{form.formState.errors.city && (
						<p className="mt-1 text-sm text-red-600">
							{form.formState.errors.city.message}
						</p>
					)}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700">
						State
					</label>
					<input
						{...form.register('state')}
						onFocus={() => trackFieldInteraction('state')}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						placeholder="CA"
						maxLength={2}
					/>
					{form.formState.errors.state && (
						<p className="mt-1 text-sm text-red-600">
							{form.formState.errors.state.message}
						</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700">
						Zip Code
					</label>
					<input
						{...form.register('zipCode')}
						onFocus={() => trackFieldInteraction('zipCode')}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
						placeholder="94107"
					/>
					{form.formState.errors.zipCode && (
						<p className="mt-1 text-sm text-red-600">
							{form.formState.errors.zipCode.message}
						</p>
					)}
				</div>
			</div>

			<div className="flex justify-end space-x-4">
				<TrackButton
					type="button"
					onClick={onCancel}
					trackEvent="property_viewed"
					trackProperties={{
						action: 'form_cancelled',
						is_editing: !!property
					}}
					className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</TrackButton>
				<TrackButton
					type="submit"
					disabled={isSubmitting}
					trackEvent={
						property ? 'property_updated' : 'property_created'
					}
					trackProperties={{ action: 'form_submitted' }}
					className="bg-primary rounded-md px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isSubmitting
						? 'Saving...'
						: property
							? 'Update Property'
							: 'Create Property'}
				</TrackButton>
			</div>
		</form>
	)
}
