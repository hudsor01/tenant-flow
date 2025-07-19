import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Building } from 'lucide-react'
import { getAllStates } from '@/lib/state-data'
import type { LeaseFormData } from '../types/lease-form-types'

interface PropertyInfoSectionProps {
	form: UseFormReturn<LeaseFormData>
}

export function PropertyInfoSection({ form }: PropertyInfoSectionProps) {
	const states = getAllStates()

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Building className="h-5 w-5 text-primary" />
					Property Information
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Property Address */}
				<div className="space-y-2">
					<Label htmlFor="propertyAddress" className="text-sm font-medium">
						Property Address *
					</Label>
					<Input
						id="propertyAddress"
						placeholder="123 Main Street"
						{...form.register('propertyAddress')}
						className={form.formState.errors.propertyAddress ? 'border-destructive' : ''}
					/>
					{form.formState.errors.propertyAddress && (
						<p className="text-destructive text-sm">
							{form.formState.errors.propertyAddress.message}
						</p>
					)}
				</div>

				{/* City, State, ZIP in a grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="city" className="text-sm font-medium">
							City *
						</Label>
						<Input
							id="city"
							placeholder="San Francisco"
							{...form.register('city')}
							className={form.formState.errors.city ? 'border-destructive' : ''}
						/>
						{form.formState.errors.city && (
							<p className="text-destructive text-sm">
								{form.formState.errors.city.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="state" className="text-sm font-medium">
							State *
						</Label>
						<Select 
							value={form.watch('state')} 
							onValueChange={(value: string) => form.setValue('state', value)}
						>
							<SelectTrigger className={form.formState.errors.state ? 'border-destructive' : ''}>
								<SelectValue placeholder="Select state" />
							</SelectTrigger>
							<SelectContent>
								{states.map((state) => (
									<SelectItem key={state.slug} value={state.slug}>
										{state.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{form.formState.errors.state && (
							<p className="text-destructive text-sm">
								{form.formState.errors.state.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="zipCode" className="text-sm font-medium">
							ZIP Code *
						</Label>
						<Input
							id="zipCode"
							placeholder="12345"
							{...form.register('zipCode')}
							className={form.formState.errors.zipCode ? 'border-destructive' : ''}
						/>
						{form.formState.errors.zipCode && (
							<p className="text-destructive text-sm">
								{form.formState.errors.zipCode.message}
							</p>
						)}
					</div>
				</div>

				{/* Unit Number (Optional) */}
				<div className="space-y-2">
					<Label htmlFor="unitNumber" className="text-sm font-medium">
						Unit Number <span className="text-muted-foreground">(Optional)</span>
					</Label>
					<Input
						id="unitNumber"
						placeholder="Apt 2B, Unit 101, etc."
						{...form.register('unitNumber')}
					/>
					<p className="text-muted-foreground text-xs">
						Leave blank if not applicable
					</p>
				</div>

				{/* State Selection Info */}
				{form.watch('state') && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div className="flex items-start gap-2">
							<MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
							<div>
								<h4 className="font-medium text-blue-900">
									State-Compliant Lease Generation
								</h4>
								<p className="text-blue-700 text-sm mt-1">
									Your lease will be generated with all required clauses and terms 
									specific to {states.find(s => s.slug === form.watch('state'))?.name} 
									state laws and regulations.
								</p>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}