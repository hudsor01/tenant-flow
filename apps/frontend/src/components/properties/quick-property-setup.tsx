'use client'

import React from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActionStateForm, type FormState } from '@/hooks/use-action-state-form'
import { FormContainer, FormInput, FormSubmit, FormError } from '@/components/ui/form-action-state'
import { createProperty } from '@/app/actions/properties'
import type { PropertyWithUnits } from '@repo/shared'

export default function QuickPropertySetup({ onCompleteAction }: { onCompleteAction?: (propertyId: string) => void }) {
	const [isComplete, setIsComplete] = React.useState(false)
	
	// Wrapper action to match useActionStateForm signature
  const wrappedCreateProperty_ = async (
    prevState: FormState<PropertyWithUnits>,
		formData: FormData
  ): Promise<FormState<PropertyWithUnits>> => {
		try {
    		const _result = await createProperty(formData)
			return { success: true, data: _result }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to create property'
			return { success: false, error: errorMessage }
		}
	}
	
	const form = useActionStateForm({
		action: wrappedCreateProperty_,
		onSuccess: (data) => {
			setIsComplete(true)
      // data is PropertyWithUnits from createProperty action
			onCompleteAction?.(data?.id)
		},
		onError: toast.error
	})

	if (isComplete) {
		return (
			<div className="py-8 text-center">
				<i className="i-lucide-check mx-auto mb-4 h-16 w-16 text-green-6"  />
				<h3 className="mb-2 text-lg font-semibold">Property Created!</h3>
				<p className="mb-4 text-sm text-gray-6">Ready for tenants and leases</p>
			</div>
		)
	}

	return (
		<Card className="w-full max-w-lg">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<i className="i-lucide-building-2 h-4 w-4"  />
					Quick Setup
				</CardTitle>
			</CardHeader>
			<CardContent>
				<FormContainer onSubmit={form.handleSubmit}>
					{form.state.error && <FormError error={form.state.error} />}
					
					<FormInput name="name" label="Property Name" required placeholder="Sunset Apartments" />
					<FormInput name="address" label="Address" required placeholder="123 Main Street" />
					
					<div className="grid grid-cols-2 gap-4">
						<FormInput name="city" label="City" required placeholder="San Francisco" />
						<FormInput name="state" label="State" required placeholder="CA" />
					</div>
					
					<FormInput name="zipCode" label="ZIP Code" required placeholder="94102" />
					
					<div className="grid grid-cols-2 gap-4">
						<FormInput name="numberOfUnits" type="number" label="Units" required defaultValue="1" min="1" max="50" />
						<FormInput name="baseRent" type="number" label="Base Rent" required defaultValue="2000" min="1" />
					</div>
					
					<div className="grid grid-cols-2 gap-4">
						<FormInput name="bedrooms" type="number" label="Bedrooms" defaultValue="2" min="0" max="10" />
						<FormInput name="bathrooms" type="number" label="Bathrooms" defaultValue="2" min="0.5" max="10" step="0.5" />
					</div>

					<FormSubmit isPending={form.isPending} className="w-full">
						Create Property
					</FormSubmit>
				</FormContainer>
			</CardContent>
		</Card>
	)
}
