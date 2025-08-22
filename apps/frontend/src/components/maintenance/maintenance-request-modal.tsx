'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maintenanceRequestFormSchema } from '@repo/shared/validation'
import type { MaintenanceRequestFormData } from '@repo/shared/validation'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Wrench } from 'lucide-react'
import { useCreateMaintenanceRequest } from '@/hooks/api/use-maintenance'
import { useProperties } from '@/hooks/api/use-properties'
import { useUnits } from '@/hooks/api/use-units'

interface MaintenanceRequestModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function MaintenanceRequestModal({
	open,
	onOpenChange
}: MaintenanceRequestModalProps) {
	const [error, setError] = useState<string | null>(null)

	const createMaintenance = useCreateMaintenanceRequest()
	const { data: properties } = useProperties()
	
	// State for property selection to load units
	const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
	const { data: units } = useUnits(selectedPropertyId)

	const form = useForm<MaintenanceRequestFormData>({
		resolver: zodResolver(maintenanceRequestFormSchema),
		defaultValues: {
			title: '',
			description: '',
			priority: 'MEDIUM',
			category: 'GENERAL',
			unitId: '',
			tenantId: '',
			assignedTo: '',
			estimatedCost: '',
			scheduledDate: '',
			accessInstructions: '',
			notes: ''
		}
	})

	const isLoading = createMaintenance.isPending

	async function onSubmit(formData: MaintenanceRequestFormData) {
		try {
			setError(null)

			await createMaintenance.mutateAsync(formData)

			onOpenChange(false)
			form.reset()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred')
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[700px]">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="bg-orange-100 rounded-lg p-2">
							<Wrench className="h-5 w-5 text-orange-600" />
						</div>
						<div>
							<DialogTitle>Schedule Maintenance Request</DialogTitle>
							<DialogDescription>
								Create a new maintenance request for your property.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{error && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6"
					>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem className="sm:col-span-2">
										<FormLabel>Title</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., Leaky faucet in kitchen"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="sm:col-span-2">
								<FormLabel>Property & Unit</FormLabel>
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<div>
										<Select
											onValueChange={(value) => {
												setSelectedPropertyId(value)
												// Reset unit selection when property changes
												form.setValue('unitId', '')
											}}
											value={selectedPropertyId}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select property first" />
											</SelectTrigger>
											<SelectContent>
												{properties?.map(property => (
													<SelectItem
														key={property.id}
														value={property.id}
													>
														{property.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									
									<FormField
										control={form.control}
										name="unitId"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Select
														onValueChange={field.onChange}
														value={field.value}
														disabled={!selectedPropertyId}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select unit" />
														</SelectTrigger>
														<SelectContent>
															{units?.map(unit => (
																<SelectItem
																	key={unit.id}
																	value={unit.id}
																>
																	Unit {unit.unitNumber}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>

							<FormField
								control={form.control}
								name="category"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Category</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select category" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="GENERAL">General</SelectItem>
												<SelectItem value="PLUMBING">Plumbing</SelectItem>
												<SelectItem value="ELECTRICAL">Electrical</SelectItem>
												<SelectItem value="HVAC">HVAC</SelectItem>
												<SelectItem value="APPLIANCES">Appliances</SelectItem>
												<SelectItem value="FLOORING">Flooring</SelectItem>
												<SelectItem value="PAINTING">Painting</SelectItem>
												<SelectItem value="LANDSCAPING">Landscaping</SelectItem>
												<SelectItem value="SECURITY">Security</SelectItem>
												<SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
												<SelectItem value="OTHER">Other</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Priority</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select priority" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="LOW">Low</SelectItem>
												<SelectItem value="MEDIUM">Medium</SelectItem>
												<SelectItem value="HIGH">High</SelectItem>
												<SelectItem value="EMERGENCY">Emergency</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="estimatedCost"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Estimated Cost (Optional)</FormLabel>
										<FormControl>
											<Input
												type="number"
												placeholder="0.00"
												step="0.01"
												min="0"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Enter estimated cost in dollars
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Describe the maintenance issue in detail..."
											className="resize-none"
											rows={4}
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Provide detailed information about the issue
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="scheduledDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Preferred Date (Optional)</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											When would you like this completed?
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="accessInstructions"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Access Instructions (Optional)</FormLabel>
										<FormControl>
											<Input
												placeholder="e.g., Key under mat, call first"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											How should maintenance access the property?
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Additional Notes (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Any additional information..."
											className="resize-none"
											rows={3}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="gap-3 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="w-full sm:w-auto"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full sm:w-auto"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									<>
										<Wrench className="mr-2 h-4 w-4" />
										Create Request
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}