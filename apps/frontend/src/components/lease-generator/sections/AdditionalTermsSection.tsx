import React from 'react'
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { DollarSign, Download, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import type { LeaseOutputFormat } from '@/types/lease-generator'

// Use a generic type that can work with any form data containing these fields
interface AdditionalTermsSectionProps<T extends FieldValues = FieldValues> {
	form: UseFormReturn<T>
	utilitiesOptions: string[]
	selectedUtilities: string[]
	handleUtilityToggle: (utility: string) => void
	selectedFormat: LeaseOutputFormat
	setSelectedFormat: (format: LeaseOutputFormat) => void
}

/**
 * Additional terms section for lease generator
 * Handles policies, utilities, and custom terms
 */
function AdditionalTermsSection<T extends FieldValues = FieldValues>({
	form,
	utilitiesOptions,
	selectedUtilities,
	handleUtilityToggle,
	selectedFormat,
	setSelectedFormat
}: AdditionalTermsSectionProps<T>) {
	const petPolicy = form.watch('petPolicy' as Path<T>)

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Property Policies</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<Label>Pet Policy</Label>
							<Select
								onValueChange={value =>
									form.setValue(
										'petPolicy' as Path<T>,
										value as any
									)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select pet policy" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="not_allowed">
										No Pets Allowed
									</SelectItem>
									<SelectItem value="allowed">
										Pets Allowed
									</SelectItem>
									<SelectItem value="with_deposit">
										Pets Allowed with Deposit
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{petPolicy === 'with_deposit' && (
							<div>
								<Label htmlFor="petDeposit">Pet Deposit</Label>
								<div className="relative">
									<DollarSign className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
									<Input
										id="petDeposit"
										type="number"
										placeholder="300"
										className="pl-9"
										{...form.register(
											'petDeposit' as Path<T>,
											{ valueAsNumber: true }
										)}
									/>
								</div>
							</div>
						)}

						<div>
							<Label>Smoking Policy</Label>
							<Select
								onValueChange={value =>
									form.setValue(
										'smokingPolicy' as Path<T>,
										value as any
									)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select smoking policy" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="not_allowed">
										No Smoking
									</SelectItem>
									<SelectItem value="allowed">
										Smoking Allowed
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label>Maintenance Responsibility</Label>
							<Select
								onValueChange={value =>
									form.setValue(
										'maintenanceResponsibility' as Path<T>,
										value as any
									)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select responsibility" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="landlord">
										Landlord
									</SelectItem>
									<SelectItem value="tenant">
										Tenant
									</SelectItem>
									<SelectItem value="shared">
										Shared
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<Separator />

					<div>
						<Label>Utilities Included</Label>
						<div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
							{utilitiesOptions.map((utility: string) => (
								<div
									key={utility}
									className="flex items-center space-x-2"
								>
									<Checkbox
										id={utility}
										checked={selectedUtilities.includes(
											utility
										)}
										onCheckedChange={() =>
											handleUtilityToggle(utility)
										}
									/>
									<Label
										htmlFor={utility}
										className="cursor-pointer text-sm font-normal"
									>
										{utility}
									</Label>
								</div>
							))}
						</div>
					</div>

					<div>
						<Label htmlFor="additionalTerms">
							Additional Terms & Conditions
						</Label>
						<Textarea
							id="additionalTerms"
							placeholder="Enter any additional lease terms, rules, or conditions..."
							className="min-h-[100px]"
							{...form.register('additionalTerms' as Path<T>)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Output Format Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Download className="h-5 w-5" />
						Download Format
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<label className="flex cursor-pointer items-center space-x-2">
							<input
								type="radio"
								name="format"
								value="pdf"
								checked={selectedFormat === 'pdf'}
								onChange={e =>
									setSelectedFormat(
										e.target.value as LeaseOutputFormat
									)
								}
								className="sr-only"
							/>
							<div
								className={`rounded-lg border-2 p-4 text-center transition-colors ${
									selectedFormat === 'pdf'
										? 'border-primary bg-primary/10'
										: 'border-border'
								}`}
							>
								<FileText className="mx-auto mb-2 h-8 w-8" />
								<div className="font-medium">PDF</div>
								<div className="text-muted-foreground text-xs">
									Ready to print
								</div>
							</div>
						</label>

						<label className="flex cursor-pointer items-center space-x-2">
							<input
								type="radio"
								name="format"
								value="docx"
								checked={selectedFormat === 'docx'}
								onChange={e =>
									setSelectedFormat(
										e.target.value as LeaseOutputFormat
									)
								}
								className="sr-only"
							/>
							<div
								className={`rounded-lg border-2 p-4 text-center transition-colors ${
									selectedFormat === 'docx'
										? 'border-primary bg-primary/10'
										: 'border-border'
								}`}
							>
								<FileText className="mx-auto mb-2 h-8 w-8" />
								<div className="font-medium">Word Doc</div>
								<div className="text-muted-foreground text-xs">
									Editable
								</div>
							</div>
						</label>

						<label className="flex cursor-pointer items-center space-x-2">
							<input
								type="radio"
								name="format"
								value="both"
								checked={selectedFormat === 'both'}
								onChange={e =>
									setSelectedFormat(
										e.target.value as LeaseOutputFormat
									)
								}
								className="sr-only"
							/>
							<div
								className={`rounded-lg border-2 p-4 text-center transition-colors ${
									selectedFormat === 'both'
										? 'border-primary bg-primary/10'
										: 'border-border'
								}`}
							>
								<Download className="mx-auto mb-2 h-8 w-8" />
								<div className="font-medium">Both (ZIP)</div>
								<div className="text-muted-foreground text-xs">
									PDF + Word
								</div>
							</div>
						</label>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export { AdditionalTermsSection }
